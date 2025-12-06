# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

## Tech Stack

- Astro 5 with React integration
- TypeScript (strict mode)
- pnpm for package management
- Node 22.17+

## Architecture

This is an event listing site using Astro's content collections.

**Content Layer:**
- Event data defined in `src/content/events/events.yaml`
- Schema validated via Zod in `src/content/config.ts`
- Events have: date, venue, address, googleMapsLink, attendees[]

**Component Structure:**
- `src/layouts/Layout.astro` - Base HTML layout
- `src/components/EventList.astro` - Fetches and sorts events (newest first)
- `src/components/EventCard.astro` - Individual event display

**Data Flow:**
EventList loads events via `getEntry('events', 'events')` from content collections, sorts by date descending, and renders EventCard components.
