export interface ResolvedVenue {
  name?: string
  address?: string
  /** The link after following any short-link redirects (goo.gl, maps.app.goo.gl, share.google, ...). */
  resolvedUrl: string
}

const GOOGLE_MAPS_HOST_PATTERN = /(^|\.)((maps\.)?google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl|share\.google)$/i

export function isGoogleMapsLink(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return GOOGLE_MAPS_HOST_PATTERN.test(hostname)
  } catch {
    return false
  }
}

/**
 * Best-effort extraction of a venue's name/address from a Google Maps link.
 * Follows redirects (short links resolve to a full maps.google.com URL with
 * the place name in the path), then falls back to scraping the og:title /
 * og:description meta tags off the resolved page. Google Maps pages are
 * heavily JS-rendered, so this is deliberately best-effort: any field it
 * can't confidently determine is left undefined for the conversation flow
 * to ask about instead.
 */
export async function resolveGoogleMapsLink(url: string, fetchImpl: typeof fetch = fetch): Promise<ResolvedVenue> {
  const response = await fetchImpl(url, {
    redirect: 'follow',
    headers: {
      // Google serves a lighter, more parseable page to non-JS crawlers.
      'User-Agent': 'Mozilla/5.0 (compatible; MeatUpBot/1.0; +https://meatup.fun)',
      Accept: 'text/html',
    },
  })

  const resolvedUrl = response.url || url
  const nameFromUrl = extractNameFromMapsUrl(resolvedUrl)

  let html = ''
  if (response.ok) {
    html = await response.text()
  }

  const ogTitle = extractMetaContent(html, 'og:title')
  const ogDescription = extractMetaContent(html, 'og:description')

  const name = ogTitle ?? nameFromUrl
  const address = addressFromDescription(ogDescription)

  return { name, address, resolvedUrl }
}

function extractNameFromMapsUrl(url: string): string | undefined {
  try {
    const { pathname } = new URL(url)
    const match = pathname.match(/\/maps\/place\/([^/]+)/)
    if (!match) return undefined
    return decodeURIComponent(match[1].replace(/\+/g, ' '))
  } catch {
    return undefined
  }
}

function extractMetaContent(html: string, property: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`,
    'i',
  )
  const match = html.match(pattern)
  if (!match) return undefined
  return decodeHtmlEntities(match[1]).trim() || undefined
}

function addressFromDescription(description: string | undefined): string | undefined {
  if (!description) return undefined
  // og:description on Maps place pages is usually "<Address> · <rating/hours/etc>".
  const [firstPart] = description.split('·')
  const trimmed = firstPart?.trim()
  return trimmed || undefined
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}
