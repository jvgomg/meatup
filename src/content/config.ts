import { defineCollection, z } from 'astro:content'

const events = defineCollection({
  type: 'data',
  schema: z.array(
    z.object({
      date: z.coerce.date(),
      venue: z.string(),
      address: z.string(),
      googleMapsLink: z.string().url(),
      attendees: z.array(z.string()),
    }),
  ),
})

export const collections = { events }
