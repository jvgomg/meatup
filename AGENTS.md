# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` - Start development server (uses Turbo)
- `pnpm build` - Build for production (uses Turbo)
- `pnpm preview` - Preview production build (uses Turbo)
- `pnpm typecheck` - Run TypeScript type checking via Astro

## Tech Stack

- Astro 5 with React integration
- TypeScript (strict mode)
- pnpm 10.23+ for package management
- Node 22.17+
- Vercel adapter for deployment (static output)
- postcss-utopia for fluid responsive typography
- Fontsource for self-hosted fonts (Inter, Oswald)

## Architecture

This is an event listing site ("Meat Up") using Astro's content collections.

**Content Layer:**
- Event data defined in `src/content/events/events.yaml`
- Schema validated via Zod in `src/content/config.ts`
- Events have: date, primaryVenue, secondaryVenues[], attendees[]
- Venues have: name, address (optional), googleMapsLink (optional)

**Pages:**
- `src/pages/index.astro` - Home page with header, about section, and event list
- `src/pages/brand.astro` - Brand guidelines page

**Component Structure:**
- `src/layouts/Layout.astro` - Base HTML layout with font imports and global CSS
- `src/components/Header.astro` - Site header with hero section and navigation
- `src/components/Navigation.astro` - Top navigation bar
- `src/components/EventList.astro` - Fetches and sorts events (newest first)
- `src/components/EventCard.astro` - Individual event display
- `src/components/LinkButton.astro` - Styled link button component

**Styling:**
- `src/styles/global.css` - Global styles with CSS custom properties
- Uses CSS variables for colors (--carbon-black, --electric-red, --stark-white)
- Uses Utopia-based fluid spacing (--space-s, --space-m, --space-l, etc.)
- Uses fluid typography (--step-0, --step-1, --text-hero, --text-section, etc.)

**Data Flow:**
EventList loads events via `getEntry('events', 'events')` from content collections, sorts by date descending, and renders EventCard components.
