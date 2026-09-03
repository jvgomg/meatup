import { z } from 'zod'
import { eventSchema, type MeatUpEvent, type Venue } from './eventSchema'
import type { EventDraft } from './types'

const draftVenueSchema = z.object({
  name: z.string().min(1, 'Venue needs a name'),
  address: z.string().optional(),
  googleMapsLink: z.string().url().optional(),
})

const draftEventSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  primaryVenue: draftVenueSchema,
  secondaryVenues: z.array(draftVenueSchema).optional(),
  attendees: z.array(z.string()).min(1, 'Need at least one attendee'),
  guests: z.array(z.string()).optional(),
  note: z.string().optional(),
})

/** Validates a completed conversation draft and turns it into a schema-valid event. */
export function buildEventFromDraft(draft: EventDraft): MeatUpEvent {
  const parsedDraft = draftEventSchema.parse(draft)
  return eventSchema.parse(parsedDraft)
}

/**
 * Inserts a new event into the raw events.yaml text, in date order, without
 * reformatting any of the existing entries — keeps the diff to just the
 * lines being added.
 */
export function appendEventToYaml(existingYaml: string, event: MeatUpEvent): string {
  const entries = splitEntries(existingYaml)
  const newEntry = formatEntry(event)
  const newDate = event.date.toISOString().slice(0, 10)

  const insertAt = entries.findIndex((entry) => extractDate(entry) > newDate)
  if (insertAt === -1) {
    entries.push(newEntry)
  } else {
    entries.splice(insertAt, 0, newEntry)
  }

  return entries.join('\n\n') + '\n'
}

function splitEntries(yamlText: string): string[] {
  const trimmed = yamlText.replace(/\n+$/, '')
  if (!trimmed.trim()) return []
  return trimmed
    .split(/\n(?=- date:)/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function extractDate(entry: string): string {
  const match = entry.match(/^- date:\s*(\S+)/)
  return match ? match[1] : ''
}

function formatEntry(event: MeatUpEvent): string {
  const lines: string[] = []
  lines.push(`- date: ${toDateString(event.date)}`)
  if (event.failed) lines.push(`  failed: true`)
  lines.push(...formatVenue('  primaryVenue:', '    ', event.primaryVenue))
  if (event.secondaryVenues?.length) {
    lines.push('  secondaryVenues:')
    for (const venue of event.secondaryVenues) {
      lines.push(...formatVenue('    -', '      ', venue, true))
    }
  }
  if (event.note) lines.push(`  note: ${yamlString(event.note)}`)
  lines.push('  attendees:')
  for (const attendee of event.attendees) lines.push(`    - ${yamlPlainOrQuoted(attendee)}`)
  if (event.guests?.length) {
    lines.push('  guests:')
    for (const guest of event.guests) lines.push(`    - ${yamlPlainOrQuoted(guest)}`)
  }
  return lines.join('\n')
}

function formatVenue(header: string, indent: string, venue: Venue, isListItem = false): string[] {
  const lines: string[] = []
  if (isListItem) {
    lines.push(`${header} name: ${yamlString(venue.name)}`)
  } else {
    lines.push(header)
    lines.push(`${indent}name: ${yamlString(venue.name)}`)
  }
  if (venue.address) lines.push(`${indent}address: ${yamlString(venue.address)}`)
  if (venue.googleMapsLink) lines.push(`${indent}googleMapsLink: ${yamlString(venue.googleMapsLink)}`)
  return lines
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function yamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

const PLAIN_SAFE = /^[^\s"'\-:#&*!|>%@`,[\]{}][^:#]*$/

function yamlPlainOrQuoted(value: string): string {
  return PLAIN_SAFE.test(value) ? value : yamlString(value)
}
