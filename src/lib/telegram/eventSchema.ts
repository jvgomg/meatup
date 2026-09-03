import { z } from 'zod'

// Mirrors src/content/config.ts. Kept separate because that file's schema is
// built with the `astro:content` virtual module, which isn't available
// outside of Astro's content layer (e.g. in this package's unit tests).

export const venueSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  googleMapsLink: z.string().url().optional(),
})

export const eventSchema = z.object({
  date: z.coerce.date(),
  failed: z.boolean().optional(),
  primaryVenue: venueSchema,
  secondaryVenues: z.array(venueSchema).optional(),
  note: z.string().optional(),
  attendees: z.array(z.string()),
  guests: z.array(z.string()).optional(),
})

export const eventsSchema = z.array(eventSchema)

export type Venue = z.infer<typeof venueSchema>
export type MeatUpEvent = z.infer<typeof eventSchema>
