import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Control,
  LatLngExpression,
  Map as LeafletMap,
  Marker,
} from "leaflet";
import type { MarkerClusterGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./EventMap.css";

type Venue = {
  name: string;
  address?: string;
  googleMapsLink?: string;
};

type EventStatus = "completed" | "failed" | "scheduled";

export type MapEvent = {
  id: string;
  eventNumber: number;
  date: string;
  status: EventStatus;
  primaryVenue: Venue;
  secondaryVenues?: Venue[];
  attendees: string[];
  note?: string;
};

type GeocodedEvent = MapEvent & {
  lat: number;
  lon: number;
  query: string;
};

type CoordinateCache = Record<string, { lat: number; lon: number }>;

const CACHE_KEY = "meatup-geocodes-v1";
const DEFAULT_CENTER: LatLngExpression = [51.509865, -0.118092]; // Central-ish London
const DEFAULT_ZOOM = 11;

type MarkerTheme = {
  className: string;
  label: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const loadCache = (): CoordinateCache => {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(CACHE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored) as CoordinateCache;
  } catch {
    return {};
  }
};

const persistCache = (cache: CoordinateCache) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache write failures; map still works without persistence.
  }
};

const geocodeAddress = async (
  query: string
): Promise<{ lat: number; lon: number } | null> => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=1`;
  const response = await fetch(url, {
    headers: { "Accept-Language": "en" },
  });

  if (!response.ok) return null;

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
  }>;

  if (!results.length) return null;

  const [match] = results;
  const lat = Number(match.lat);
  const lon = Number(match.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
};

const createTooltipContent = (event: MapEvent) => {
  const container = document.createElement("div");
  container.className = "meat-tooltip__content";

  const title = document.createElement("h3");
  title.textContent = event.primaryVenue.name;

  const meta = document.createElement("p");
  meta.className = "meat-tooltip__meta";
  meta.textContent = `#${event.eventNumber.toString().padStart(3, "0")} · ${formatDate(event.date)}`;

  container.append(title, meta);
  return container;
};

const getVenueTheme = (name: string): MarkerTheme => {
  const lower = name.toLowerCase();
  const themes: Array<{ match: RegExp; className: string; label: string }> = [
    { match: /texas|tx/, className: "marker--texas", label: "TX" },
    { match: /smoke|bbq|fire|grill|stack/, className: "marker--smoke", label: "🔥" },
    { match: /chop|butcher|carcass|steak|meat/, className: "marker--chop", label: "CHOP" },
    { match: /butter|cream/, className: "marker--butter", label: "🧈" },
    { match: /black|cactus/, className: "marker--black", label: "BLK" },
    { match: /burger|beyond/, className: "marker--burger", label: "BRGR" },
    { match: /fowl|bird|chicken/, className: "marker--fowl", label: "🐔" },
    { match: /guinea|pig/, className: "marker--guinea", label: "🐷" },
    { match: /market/, className: "marker--market", label: "MK" },
    { match: /wine|brew|ale|inn|tavern|pub/, className: "marker--pub", label: "🍺" },
  ];

  const found = themes.find(({ match }) => match.test(lower));
  if (found) return { className: found.className, label: found.label };

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return { className: "marker--default", label: initials || "MU" };
};

const createMarkerIcon = (
  L: typeof import("leaflet"),
  theme: MarkerTheme
) =>
  L.divIcon({
    className: "meat-marker",
    html: `
      <div class="meat-marker__body ${theme.className}">
        <span class="meat-marker__fat"></span>
        <span class="meat-marker__glow"></span>
        <span class="meat-marker__label">${theme.label}</span>
      </div>
    `,
    iconSize: [56, 56],
    iconAnchor: [28, 52],
    popupAnchor: [0, -38],
  });

const attachHoverTooltip = (marker: Marker) => {
  let closeTimer: number | undefined;

  const open = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = undefined;
    }
    marker.openTooltip();
  };

  const scheduleClose = () => {
    closeTimer = window.setTimeout(() => marker.closeTooltip(), 140);
  };

  marker.on("mouseover", open);
  marker.on("mouseout", scheduleClose);
  marker.on("click", open);
};

export default function EventMapClient({ events }: { events: MapEvent[] }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<MarkerClusterGroup | null>(null);
  const zoomControlRef = useRef<Control.Zoom | null>(null);
  const attributionControlRef = useRef<Control.Attribution | null>(null);
  const [geocoded, setGeocoded] = useState<GeocodedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const sortedEvents = useMemo(
    () => events.toSorted((a, b) => b.eventNumber - a.eventNumber),
    [events]
  );

  useEffect(() => {
    let isMounted = true;
    let mapCleanup: (() => void) | undefined;

    const initialiseMap = async () => {
      const [{ default: L }] = await Promise.all([import("leaflet")]);
      if (!mapContainerRef.current || !isMounted) return;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        worldCopyJump: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        className: "meatup-tile",
      }).addTo(map);

      const attribution = L.control.attribution({
        position: "bottomleft",
        prefix: "",
      });
      attribution.addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      );
      attribution.addTo(map);
      attributionControlRef.current = attribution;

      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      mapRef.current = map;

      mapCleanup = () => {
        if (zoomControlRef.current) {
          map.removeControl(zoomControlRef.current);
          zoomControlRef.current = null;
        }
        if (attributionControlRef.current) {
          map.removeControl(attributionControlRef.current);
          attributionControlRef.current = null;
        }
        map.remove();
        mapRef.current = null;
      };
    };

    initialiseMap().catch((err) => {
      console.error(err);
      setError("Could not load the map right now.");
    });

    return () => {
      isMounted = false;
      mapCleanup?.();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    // Give the DOM a moment to settle when toggling fullscreen.
    const id = window.setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 24);
    return () => window.clearTimeout(id);
  }, [isFullscreen]);

  useEffect(() => {
    let isMounted = true;
    const cache = loadCache();

    const geocode = async () => {
      const results: GeocodedEvent[] = [];

      for (const event of sortedEvents) {
        const query =
          event.primaryVenue.address?.trim() || event.primaryVenue.name.trim();

        if (!query) continue;

        const cached = cache[query];
        if (cached) {
          results.push({ ...event, ...cached, query });
          continue;
        }

        const coords = await geocodeAddress(query);
        if (coords) {
          cache[query] = coords;
          results.push({ ...event, ...coords, query });
          persistCache(cache);
        }
      }

      if (isMounted) {
        setGeocoded(results);
      }
    };

    geocode().catch((err) => {
      console.error(err);
      setError("Could not place markers for these meatings.");
    });

    return () => {
      isMounted = false;
    };
  }, [sortedEvents]);

  useEffect(() => {
    const placeMarkers = async () => {
      if (!mapRef.current) return;
      if (!geocoded.length) {
        mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        return;
      }

      const [{ default: L }] = await Promise.all([
        import("leaflet"),
        import("leaflet.markercluster"),
      ]);

      if (markerLayerRef.current) {
        markerLayerRef.current.remove();
        markerLayerRef.current = null;
      }

      const layer = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderLegPolylineOptions: { weight: 2, color: "#e04f5f", opacity: 0.85 },
        maxClusterRadius: 48,
        iconCreateFunction(cluster) {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div class="meat-cluster"><span>${count}</span></div>`,
            className: "meat-cluster-wrapper",
            iconSize: [48, 48],
          });
        },
      });

      for (const event of geocoded) {
        const theme = getVenueTheme(event.primaryVenue.name);
        const icon = createMarkerIcon(L, theme);
        const marker = L.marker([event.lat, event.lon], { icon });
        marker.bindTooltip(createTooltipContent(event), {
          className: "meat-tooltip",
          opacity: 1,
          direction: "top",
          offset: [0, -6],
          sticky: true,
          permanent: false,
        });
        attachHoverTooltip(marker);
        layer.addLayer(marker);
      }

      layer.addTo(mapRef.current);
      markerLayerRef.current = layer;

      const bounds = L.latLngBounds(
        geocoded.map((item) => [item.lat, item.lon] as [number, number])
      );
      mapRef.current.fitBounds(bounds.pad(0.2));
    };

    placeMarkers().catch((err) => {
      console.error(err);
      setError("Map markers failed to render.");
    });
  }, [geocoded]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (isFullscreen) {
      body.classList.add("map-fullscreen-active");
    } else {
      body.classList.remove("map-fullscreen-active");
    }
    return () => body.classList.remove("map-fullscreen-active");
  }, [isFullscreen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const syncInteractivity = async () => {
      if (!mapRef.current) return;
      const [{ default: L }] = await Promise.all([import("leaflet")]);
      const map = mapRef.current;
      if (isFullscreen) {
        map.dragging.enable();
        map.scrollWheelZoom.enable();
        map.doubleClickZoom.enable();
        map.boxZoom.enable();
        map.keyboard.enable();
        map.touchZoom.enable();
        if (!zoomControlRef.current) {
          zoomControlRef.current = L.control.zoom({ position: "bottomright" });
          zoomControlRef.current.addTo(map);
        }
      } else {
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        map.touchZoom.disable();
        if (zoomControlRef.current) {
          map.removeControl(zoomControlRef.current);
          zoomControlRef.current = null;
        }
      }
    };
    syncInteractivity();
  }, [isFullscreen]);

  const recenter = async () => {
    if (!mapRef.current) return;
    const [{ default: L }] = await Promise.all([import("leaflet")]);
    if (geocoded.length) {
      const bounds = L.latLngBounds(
        geocoded.map((item) => [item.lat, item.lon] as [number, number])
      );
      mapRef.current.fitBounds(bounds.pad(0.2));
    } else {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  };

  useEffect(() => {
    if (!isFullscreen) {
      void recenter();
    }
  }, [isFullscreen]);

  return (
    <div className={`map-shell ${isFullscreen ? "map-shell--fullscreen" : ""}`}>
      {
        isFullscreen && (
          <div className="map-shell__controls">
            <button
              type="button"
              className="map-shell__control-button map-shell__control-button--icon"
              onClick={() => setIsFullscreen(false)}
              aria-label="Close full screen map"
            >
              ×
            </button>
            <button
              type="button"
              className="map-shell__control-button"
              onClick={recenter}
            >
              Center map
            </button>
          </div>
        )
      }
      <div
        ref={mapContainerRef}
        className={`event-map ${!isFullscreen ? "event-map--inactive" : ""}`}
        role="presentation"
        onClick={() => {
          if (!isFullscreen) setIsFullscreen(true);
        }}
      />
      {
        !isFullscreen && (
          <button
            type="button"
            className="map-shell__click-capture"
            aria-label="Open map in full screen"
            onClick={() => setIsFullscreen(true)}
          />
        )
      }
      {error && <p className="map-error">{error}</p>}
    </div>
  );
}
