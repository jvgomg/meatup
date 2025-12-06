# MEAT UP

> A digital smokehouse meets disruptive tech platform. Neo-brutalist, loud, unapologetic. **No salads allowed.**

An event listing site for serious carnivores. Built with Astro 5, React, and TypeScript.

## Tech Stack

- **Astro 5** - Static site generation with content collections
- **React 19** - Interactive components
- **TypeScript** - Strict mode enabled
- **pnpm** - Package management

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
    EventList.astro      # Fetches & sorts events
    EventCard.astro      # Individual event display
  layouts/
    Layout.astro         # Base HTML layout
  pages/
    index.astro          # Homepage
docs/
  brand-guidelines.md    # Design manifesto
```

## Brand Guidelines

### Color Palette

| Role | Name | Hex |
|------|------|-----|
| Primary | Electric Red | `#E04F5F` |
| Action/CTA | Mustard Yellow | `#FFDB58` |
| Text/Borders | Carbon Black | `#000000` |
| Background | Stark White | `#FFFFFF` |

### Design Principles

- **Typography is Image** - Headlines are massive, condensed, all-caps
- **No Softness** - Hard edges, thick black borders, no gradients
- **Raw Imagery** - High-contrast B&W photography
- **The Slab CTA** - Heavy buttons with 4px+ borders and flat shadows

See [docs/brand-guidelines.md](docs/brand-guidelines.md) for the full design manifesto.

## Content

Events are defined in `src/content/events/events.yaml` with the following schema:

- `date` - Event date
- `venue` - Venue name
- `address` - Physical address
- `googleMapsLink` - Link to Google Maps
- `attendees` - List of attendees

## License

Private
