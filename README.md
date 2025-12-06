# MEAT UP

> A digital smokehouse meets disruptive tech platform. Neo-brutalist, loud, unapologetic. **No salads allowed.**

An event listing site for serious carnivores. Built with Astro 5, React, and TypeScript.

## Tech Stack

- **Astro 5** - Static site generation with content collections
- **React 19** - Interactive components
- **TypeScript** - Strict mode enabled
- **pnpm + Turbo** - Package management and build orchestration
- **Vercel** - Deployment adapter (static output)
- **postcss-utopia** - Fluid responsive typography and spacing
- **Fontsource** - Self-hosted fonts (Inter, Oswald)

## Requirements

- Node.js 22.17+
- pnpm 10.23+

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
src/
  content/
    events/events.yaml   # Event data (YAML)
    config.ts            # Zod schema validation
  components/
    Header.astro         # Site header with hero section
    Navigation.astro     # Top navigation bar
    EventList.astro      # Fetches & sorts events
    EventCard.astro      # Individual event display
    LinkButton.astro     # Styled link button
  layouts/
    Layout.astro         # Base HTML layout
  pages/
    index.astro          # Homepage
    brand.astro          # Brand guidelines page
  styles/
    global.css           # Global styles & CSS variables
docs/
  brand-guidelines.md    # Design manifesto
  design-guidelines.md   # Design system details
  photography.md         # Photography guidelines
```

## Brand Guidelines

See [docs/brand-guidelines.md](docs/brand-guidelines.md) and [docs/design-guidelines.md](docs/design-guidelines.md) for the full design manifesto.

## Content

Events are defined in `src/content/events/events.yaml` with the following schema:

- `date` - Event date
- `primaryVenue` - Main venue object
  - `name` - Venue name
  - `address` - Physical address (optional)
  - `googleMapsLink` - Link to Google Maps (optional)
- `secondaryVenues` - Array of additional venues (optional)
- `attendees` - List of attendee aliases (no real names in git). Keep any real-name → alias mapping locally in `local/attendee-aliases.yaml` (gitignored).

Attendee “first meat up” labels are derived automatically based on the earliest event containing each alias.

## License

Private
