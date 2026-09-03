import { describe, expect, it, vi } from 'vitest'
import { isGoogleMapsLink, resolveGoogleMapsLink } from './googleMaps'

describe('isGoogleMapsLink', () => {
  it.each([
    'https://maps.app.goo.gl/omSPC5B5cXdBMfFz5',
    'https://goo.gl/maps/abc123',
    'https://share.google/LiPXyz4sGBfIu1nTD',
    'https://maps.google.com/?q=Texas+Joes',
    'https://www.google.com/maps/place/Texas+Joes/@51.5,0.0,15z',
  ])('accepts %s', (url) => {
    expect(isGoogleMapsLink(url)).toBe(true)
  })

  it.each(['https://example.com', 'not a url', 'https://facebook.com/events/123'])(
    'rejects %s',
    (url) => {
      expect(isGoogleMapsLink(url)).toBe(false)
    },
  )
})

describe('resolveGoogleMapsLink', () => {
  it('extracts name and address from the resolved page', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      url: 'https://www.google.com/maps/place/Texas+Joe%27s+Slow+Smoked+Meats/@51.5,0,15z',
      text: async () =>
        `<meta property="og:title" content="Texas Joe&#39;s Slow Smoked Meats">` +
        `<meta property="og:description" content="8-9 Snowsfields, London SE1 3SU · Barbecue restaurant">`,
    })

    const result = await resolveGoogleMapsLink('https://maps.app.goo.gl/omSPC5B5cXdBMfFz5', fetchImpl as any)

    expect(result.name).toBe("Texas Joe's Slow Smoked Meats")
    expect(result.address).toBe('8-9 Snowsfields, London SE1 3SU')
    expect(result.resolvedUrl).toContain('google.com/maps')
  })

  it('falls back to the place name in the URL when the page has no meta tags', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      url: 'https://www.google.com/maps/place/Smokestak/@51.5,0,15z',
      text: async () => '<html></html>',
    })

    const result = await resolveGoogleMapsLink('https://maps.app.goo.gl/Cfo4QGXioPPgefaF7', fetchImpl as any)

    expect(result.name).toBe('Smokestak')
    expect(result.address).toBeUndefined()
  })

  it('degrades gracefully when the response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      url: 'https://www.google.com/maps/place/Blocked+Page',
      text: async () => '',
    })

    const result = await resolveGoogleMapsLink('https://maps.app.goo.gl/xyz', fetchImpl as any)

    expect(result.name).toBe('Blocked Page')
    expect(result.resolvedUrl).toBe('https://www.google.com/maps/place/Blocked+Page')
  })
})
