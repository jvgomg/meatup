import { defineCollection, z } from 'astro:content'

const venueSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  googleMapsLink: z.string().url().optional(),
})

const events = defineCollection({
  type: 'data',
  schema: z.array(
    z.object({
      date: z.coerce.date(),
      status: z
        .enum(['completed', 'failed', 'scheduled', 'planning'])
        .default('scheduled'),
      primaryVenue: venueSchema,
      secondaryVenues: z.array(venueSchema).optional(),
      note: z.string().optional(),
      attendees: z.array(z.string()),
    }),
  ),
})

export const collections = { events }
