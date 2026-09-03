import { describe, expect, it } from 'vitest'
import { appendEventToYaml, buildEventFromDraft } from './eventBuilder'
import type { EventDraft } from './types'

const validDraft: EventDraft = {
  date: '2026-08-01',
  primaryVenue: { name: "Al's BBQ", address: '1 Fake Street', googleMapsLink: 'https://maps.google.com/?q=x' },
  attendees: ['Alex T', 'Martin J'],
}

describe('buildEventFromDraft', () => {
  it('builds a schema-valid event from a complete draft', () => {
    const event = buildEventFromDraft(validDraft)
    expect(event.primaryVenue.name).toBe("Al's BBQ")
    expect(event.attendees).toEqual(['Alex T', 'Martin J'])
    expect(event.date.toISOString().slice(0, 10)).toBe('2026-08-01')
  })

  it('rejects a draft missing an attendee', () => {
    expect(() => buildEventFromDraft({ ...validDraft, attendees: [] })).toThrow()
  })

  it('rejects a draft with no venue name', () => {
    expect(() =>
      buildEventFromDraft({ ...validDraft, primaryVenue: { ...validDraft.primaryVenue, name: undefined } as any }),
    ).toThrow()
  })

  it('rejects a malformed date', () => {
    expect(() => buildEventFromDraft({ ...validDraft, date: '18 April 2026' })).toThrow()
  })
})

describe('appendEventToYaml', () => {
  const existing = [
    '- date: 2024-01-01',
    '  primaryVenue:',
    '    name: "Old Spot"',
    '  attendees:',
    '    - Alex T',
    '',
    '- date: 2026-12-31',
    '  primaryVenue:',
    '    name: "New Year Spot"',
    '  attendees:',
    '    - Alex T',
    '',
  ].join('\n')

  it('inserts a new event in date order between existing entries', () => {
    const event = buildEventFromDraft(validDraft)
    const result = appendEventToYaml(existing, event)

    const dates = [...result.matchAll(/^- date: (\S+)/gm)].map((m) => m[1])
    expect(dates).toEqual(['2024-01-01', '2026-08-01', '2026-12-31'])
  })

  it('renders venue name/address/link with escaped double-quoted strings', () => {
    const event = buildEventFromDraft({
      ...validDraft,
      primaryVenue: { name: 'Joe "The Grill" Bloggs', address: '1 Fake St', googleMapsLink: 'https://maps.google.com/?q=x' },
    })
    const result = appendEventToYaml('', event)

    expect(result).toContain('name: "Joe \\"The Grill\\" Bloggs"')
    expect(result).toContain('address: "1 Fake St"')
    expect(result).toContain('googleMapsLink: "https://maps.google.com/?q=x"')
  })

  it('includes secondary venues, guests and notes when present', () => {
    const event = buildEventFromDraft({
      ...validDraft,
      secondaryVenues: [{ name: 'Pre-drinks Pub', address: '2 Fake St' }],
      guests: ['Guest One'],
      note: 'Table booked for 7pm',
    })
    const result = appendEventToYaml('', event)

    expect(result).toContain('secondaryVenues:')
    expect(result).toContain('- name: "Pre-drinks Pub"')
    expect(result).toContain('guests:')
    expect(result).toContain('- Guest One')
    expect(result).toContain('note: "Table booked for 7pm"')
  })

  it('appends after the last entry when the new date is latest', () => {
    const event = buildEventFromDraft({ ...validDraft, date: '2027-01-01' })
    const result = appendEventToYaml(existing, event)
    const dates = [...result.matchAll(/^- date: (\S+)/gm)].map((m) => m[1])
    expect(dates).toEqual(['2024-01-01', '2026-12-31', '2027-01-01'])
  })

  it('works against an empty file', () => {
    const event = buildEventFromDraft(validDraft)
    const result = appendEventToYaml('', event)
    expect(result.trim().startsWith('- date: 2026-08-01')).toBe(true)
  })
})
