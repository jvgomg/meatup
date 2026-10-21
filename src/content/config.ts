import { defineCollection, z } from 'astro:content'

const venueSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  googleMapsLink: z.string().url().optional(),
  // [latitude, longitude] — used to plot the venue on the map page
  coordinates: z.tuple([z.number(), z.number()]).optional(),
})

const events = defineCollection({
  type: 'data',
  schema: z.array(
    z.object({
      date: z.coerce.date(),
      failed: z.boolean().optional(),
      primaryVenue: venueSchema,
      secondaryVenues: z.array(venueSchema).optional(),
      note: z.string().optional(),
      attendees: z.array(z.string()),
      guests: z.array(z.string()).optional(),
    }),
  ),
})

export const collections = { events }
