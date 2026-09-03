import { describe, expect, it, vi } from 'vitest'
import { handleMessage, type ConversationDeps } from './conversation'
import { createConversation } from './types'
import type { ResolvedVenue } from './googleMaps'

function depsWith(resolved: ResolvedVenue): ConversationDeps {
  return { resolveGoogleMapsLink: vi.fn().mockResolvedValue(resolved) }
}

describe('handleMessage', () => {
  it('walks the full happy path via a resolved Google Maps link', async () => {
    let state = createConversation(1)
    const deps = depsWith({
      name: "Texas Joe's",
      address: '8-9 Snowsfields, London SE1 3SU',
      resolvedUrl: 'https://maps.google.com/?q=texas+joes',
    })

    let result = await handleMessage(state, '/newmeatup', deps)
    expect(result.reply).toMatch(/when is it happening/i)
    state = result.state

    result = await handleMessage(state, '2026-08-01', deps)
    expect(result.reply).toMatch(/google maps link/i)
    state = result.state

    result = await handleMessage(state, 'https://maps.app.goo.gl/omSPC5B5cXdBMfFz5', deps)
    expect(result.reply).toContain("Texas Joe's")
    expect(result.reply).toContain('8-9 Snowsfields, London SE1 3SU')
    state = result.state

    result = await handleMessage(state, 'yes', deps)
    expect(result.reply).toMatch(/secondary venue/i)
    state = result.state

    result = await handleMessage(state, 'skip', deps)
    expect(result.reply).toMatch(/who's coming/i)
    state = result.state

    result = await handleMessage(state, 'Alex T, Martin J', deps)
    expect(result.reply).toMatch(/guests/i)
    state = result.state

    result = await handleMessage(state, 'skip', deps)
    expect(result.reply).toMatch(/notes/i)
    state = result.state

    result = await handleMessage(state, 'Booking at 7pm', deps)
    expect(result.reply).toContain('Booking at 7pm')
    expect(result.reply).toContain('Alex T, Martin J')
    state = result.state

    result = await handleMessage(state, 'yes', deps)
    expect(result.completedDraft).toMatchObject({
      date: '2026-08-01',
      primaryVenue: {
        name: "Texas Joe's",
        address: '8-9 Snowsfields, London SE1 3SU',
        googleMapsLink: 'https://maps.google.com/?q=texas+joes',
      },
      attendees: ['Alex T', 'Martin J'],
      note: 'Booking at 7pm',
    })
    expect(result.state.step).toBe('idle')
  })

  it('supports manual entry when the venue is skipped', async () => {
    let state = createConversation(2)
    const deps = depsWith({ resolvedUrl: 'unused' })

    let result = await handleMessage(state, '/newmeatup', deps)
    state = result.state
    result = await handleMessage(state, '2026-09-05', deps)
    state = result.state

    result = await handleMessage(state, 'skip', deps)
    expect(result.reply).toMatch(/venue called/i)
    state = result.state

    result = await handleMessage(state, 'Smokestak', deps)
    expect(result.reply).toMatch(/address/i)
    state = result.state

    result = await handleMessage(state, 'skip', deps)
    state = result.state
    expect(state.draft.primaryVenue).toEqual({ name: 'Smokestak' })
  })

  it('rejects an unparseable date and stays on the same step', async () => {
    let state = createConversation(3)
    const deps = depsWith({ resolvedUrl: 'unused' })

    let result = await handleMessage(state, '/newmeatup', deps)
    state = result.state
    result = await handleMessage(state, 'whenever works', deps)
    expect(result.reply).toMatch(/couldn't parse/i)
    expect(result.state.step).toBe('ask_date')
  })

  it('rejects a non-maps link and reprompts', async () => {
    let state = createConversation(4)
    const deps = depsWith({ resolvedUrl: 'unused' })

    let result = await handleMessage(state, '/newmeatup', deps)
    state = result.state
    result = await handleMessage(state, '2026-09-05', deps)
    state = result.state
    result = await handleMessage(state, 'https://example.com/not-maps', deps)
    expect(result.reply).toMatch(/doesn't look like a google maps link/i)
    expect(result.state.step).toBe('ask_maps_link')
  })

  it('lets the user override the extracted venue name/address', async () => {
    let state = createConversation(5)
    const deps = depsWith({ name: 'Wrong Name', address: undefined, resolvedUrl: 'https://maps.google.com/?q=x' })

    let result = await handleMessage(state, '/newmeatup', deps)
    state = result.state
    result = await handleMessage(state, '2026-09-05', deps)
    state = result.state
    result = await handleMessage(state, 'https://maps.app.goo.gl/abc', deps)
    state = result.state

    result = await handleMessage(state, 'Right Name | 42 Real Street', deps)
    expect(result.state.draft.primaryVenue).toMatchObject({ name: 'Right Name', address: '42 Real Street' })
    expect(result.reply).toContain('Right Name')
  })

  it('can be cancelled mid-flow', async () => {
    let state = createConversation(6)
    const deps = depsWith({ resolvedUrl: 'unused' })

    let result = await handleMessage(state, '/newmeatup', deps)
    state = result.state
    result = await handleMessage(state, '/cancel', deps)
    expect(result.reply).toMatch(/cancelled/i)
    expect(result.state.step).toBe('idle')
  })

  it('does nothing on an unrecognised message when idle', async () => {
    const state = createConversation(7)
    const deps = depsWith({ resolvedUrl: 'unused' })
    const result = await handleMessage(state, 'hello', deps)
    expect(result.reply).toMatch(/\/newmeatup/)
    expect(result.state.step).toBe('idle')
  })

  it('collects multiple secondary venues in a loop', async () => {
    let state = createConversation(8)
    const deps: ConversationDeps = {
      resolveGoogleMapsLink: vi
        .fn()
        .mockResolvedValueOnce({ name: 'Primary Spot', resolvedUrl: 'https://maps.google.com/?q=primary' })
        .mockResolvedValueOnce({ name: 'Pre-drinks A', resolvedUrl: 'https://maps.google.com/?q=a' })
        .mockResolvedValueOnce({ name: 'Pre-drinks B', resolvedUrl: 'https://maps.google.com/?q=b' }),
    }

    let result = await handleMessage(state, '/newmeatup', deps)
    state = result.state
    result = await handleMessage(state, '2026-09-05', deps)
    state = result.state
    result = await handleMessage(state, 'https://maps.app.goo.gl/primary', deps)
    state = result.state
    result = await handleMessage(state, 'yes', deps)
    state = result.state

    result = await handleMessage(state, 'https://maps.app.goo.gl/a', deps)
    expect(result.reply).toContain('Pre-drinks A')
    state = result.state

    result = await handleMessage(state, 'https://maps.app.goo.gl/b', deps)
    expect(result.reply).toContain('Pre-drinks B')
    state = result.state

    result = await handleMessage(state, 'done', deps)
    expect(state.draft.secondaryVenues).toHaveLength(2)
    expect(result.reply).toMatch(/who's coming/i)
  })
})
