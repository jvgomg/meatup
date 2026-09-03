import type { ConversationState, ConversationStep, EventDraft, VenueDraft } from './types'
import { createConversation } from './types'
import { isGoogleMapsLink, resolveGoogleMapsLink, type ResolvedVenue } from './googleMaps'

export interface ConversationDeps {
  resolveGoogleMapsLink: typeof resolveGoogleMapsLink
}

export const defaultDeps: ConversationDeps = { resolveGoogleMapsLink }

export interface ConversationResult {
  state: ConversationState
  reply: string
  /** Populated on the turn the user confirms submission; the caller should build the PR from this. */
  completedDraft?: Required<Pick<EventDraft, 'date' | 'primaryVenue' | 'attendees'>> & EventDraft
}

const START_COMMANDS = ['/newmeatup', '/addvenue', '/start']
const CANCEL_COMMANDS = ['/cancel', 'cancel']

export async function handleMessage(
  state: ConversationState,
  rawText: string,
  deps: ConversationDeps = defaultDeps,
): Promise<ConversationResult> {
  const text = rawText.trim()
  const lower = text.toLowerCase()

  if (CANCEL_COMMANDS.includes(lower) && state.step !== 'idle') {
    return { state: createConversation(state.chatId), reply: 'Cancelled — no changes made.' }
  }

  if (state.step === 'idle') {
    if (START_COMMANDS.includes(lower)) {
      return advance(state, 'ask_date', {}, 'New meat up 🍖 When is it happening? (e.g. 2026-04-18)')
    }
    return {
      state,
      reply: "Send /newmeatup to add a new meat up (date, venue, attendees). Send /cancel any time to abort.",
    }
  }

  switch (state.step) {
    case 'ask_date':
      return handleAskDate(state, text)
    case 'ask_maps_link':
      return handleAskMapsLink(state, text, deps)
    case 'confirm_venue':
      return handleConfirmVenue(state, text)
    case 'ask_venue_name':
      return handleAskVenueName(state, text)
    case 'ask_venue_address':
      return handleAskVenueAddress(state, text)
    case 'ask_secondary_venue':
      return handleAskSecondaryVenue(state, text, deps)
    case 'ask_attendees':
      return handleAskAttendees(state, text)
    case 'ask_guests':
      return handleAskGuests(state, text)
    case 'ask_note':
      return handleAskNote(state, text)
    case 'confirm':
      return handleConfirm(state, text)
    default:
      return { state: createConversation(state.chatId), reply: 'Something went wrong — starting over. Send /newmeatup to try again.' }
  }
}

function handleAskDate(state: ConversationState, text: string): ConversationResult {
  const date = parseDate(text)
  if (!date) {
    return {
      state,
      reply: "I couldn't parse that date. Try YYYY-MM-DD (e.g. 2026-04-18) or DD/MM/YYYY.",
    }
  }
  return advance(
    state,
    'ask_maps_link',
    { date: date.toISOString().slice(0, 10) },
    "Got it. Now send me the Google Maps link for the venue (or 'skip' to enter the details manually).",
  )
}

async function handleAskMapsLink(
  state: ConversationState,
  text: string,
  deps: ConversationDeps,
): Promise<ConversationResult> {
  if (text.toLowerCase() === 'skip') {
    return advance(state, 'ask_venue_name', {}, "No problem — what's the venue called?")
  }

  if (!isGoogleMapsLink(text)) {
    return {
      state,
      reply: "That doesn't look like a Google Maps link. Send one (starts with https://maps.app.goo.gl/, https://goo.gl/, https://share.google/ or https://maps.google.com/...), or 'skip' to enter details manually.",
    }
  }

  let resolved: ResolvedVenue
  try {
    resolved = await deps.resolveGoogleMapsLink(text)
  } catch {
    resolved = { resolvedUrl: text }
  }

  const primaryVenue: VenueDraft = {
    name: resolved.name,
    address: resolved.address,
    googleMapsLink: resolved.resolvedUrl,
  }

  const next = advance(state, 'confirm_venue', { primaryVenue }, '')
  next.reply = venueConfirmationPrompt(primaryVenue)
  return next
}

function venueConfirmationPrompt(venue: VenueDraft): string {
  const lines = [
    `Here's what I found:`,
    `Name: ${venue.name ?? '(unknown)'}`,
    `Address: ${venue.address ?? '(unknown)'}`,
    '',
    "Reply 'yes' to confirm, or send the correct venue name (and optionally ' | address') to fix it up.",
  ]
  return lines.join('\n')
}

function handleConfirmVenue(state: ConversationState, text: string): ConversationResult {
  if (/^y(es)?$/i.test(text)) {
    if (!state.draft.primaryVenue?.name) {
      return { state, reply: "I still don't have a venue name — send it now." }
    }
    return advance(
      state,
      'ask_secondary_venue',
      {},
      "Any pre-drinks or secondary venue? Send its Google Maps link, or 'skip'.",
    )
  }

  const [namePart, addressPart] = text.split('|').map((part) => part.trim())
  const primaryVenue: VenueDraft = {
    ...state.draft.primaryVenue,
    name: namePart || state.draft.primaryVenue?.name,
    address: addressPart || state.draft.primaryVenue?.address,
  }
  const next = advance(state, 'confirm_venue', { primaryVenue }, '')
  next.reply = venueConfirmationPrompt(primaryVenue)
  return next
}

function handleAskVenueName(state: ConversationState, text: string): ConversationResult {
  if (!text) {
    return { state, reply: 'The venue needs a name — what should I call it?' }
  }
  const primaryVenue: VenueDraft = { ...state.draft.primaryVenue, name: text }
  return advance(state, 'ask_venue_address', { primaryVenue }, "What's the address? (or 'skip')")
}

function handleAskVenueAddress(state: ConversationState, text: string): ConversationResult {
  const address = text.toLowerCase() === 'skip' ? undefined : text
  const primaryVenue: VenueDraft = { ...state.draft.primaryVenue, address }
  return advance(
    state,
    'ask_secondary_venue',
    { primaryVenue },
    "Any pre-drinks or secondary venue? Send its Google Maps link, or 'skip'.",
  )
}

async function handleAskSecondaryVenue(
  state: ConversationState,
  text: string,
  deps: ConversationDeps,
): Promise<ConversationResult> {
  if (['skip', 'done', 'no'].includes(text.toLowerCase())) {
    return advance(state, 'ask_attendees', {}, "Who's coming? Send names separated by commas.")
  }

  if (!isGoogleMapsLink(text)) {
    return {
      state,
      reply: "That doesn't look like a Google Maps link. Send one, or 'skip'/'done' to move on.",
    }
  }

  let resolved: ResolvedVenue
  try {
    resolved = await deps.resolveGoogleMapsLink(text)
  } catch {
    resolved = { resolvedUrl: text }
  }

  const secondaryVenues = [
    ...(state.draft.secondaryVenues ?? []),
    { name: resolved.name, address: resolved.address, googleMapsLink: resolved.resolvedUrl } satisfies VenueDraft,
  ]

  return advance(
    state,
    'ask_secondary_venue',
    { secondaryVenues },
    `Added "${resolved.name ?? resolved.resolvedUrl}". Another secondary venue? Send a link, or 'done'.`,
  )
}

function handleAskAttendees(state: ConversationState, text: string): ConversationResult {
  const attendees = splitNames(text)
  if (attendees.length === 0) {
    return { state, reply: "I need at least one attendee — who's coming?" }
  }
  return advance(
    state,
    'ask_guests',
    { attendees },
    "Any plus-ones or guests? Comma-separated names, or 'skip'.",
  )
}

function handleAskGuests(state: ConversationState, text: string): ConversationResult {
  const guests = text.toLowerCase() === 'skip' ? undefined : splitNames(text)
  return advance(
    state,
    'ask_note',
    { guests },
    "Any notes about the plan (booking time, pre-drinks, etc.)? Or 'skip'.",
  )
}

function handleAskNote(state: ConversationState, text: string): ConversationResult {
  const note = text.toLowerCase() === 'skip' ? undefined : text
  const next = advance(state, 'confirm', { note }, '')
  next.reply = summarize(next.state.draft)
  return next
}

function handleConfirm(state: ConversationState, text: string): ConversationResult {
  const lower = text.toLowerCase()
  if (lower === 'cancel' || lower === 'no') {
    return { state: createConversation(state.chatId), reply: 'Cancelled — no changes made.' }
  }
  if (!/^y(es)?$/i.test(lower)) {
    return { state, reply: "Reply 'yes' to open a PR with this meat up, or 'cancel' to discard." }
  }

  const draft = state.draft
  if (!draft.date || !draft.primaryVenue?.name || !draft.attendees?.length) {
    return { state: createConversation(state.chatId), reply: "Something's missing — starting over. Send /newmeatup to try again." }
  }

  const completedDraft = draft as Required<Pick<EventDraft, 'date' | 'primaryVenue' | 'attendees'>> & EventDraft

  return {
    state: createConversation(state.chatId),
    reply: 'Opening a pull request with this meat up now…',
    completedDraft,
  }
}

function summarize(draft: EventDraft): string {
  const lines = [
    'Here we go:',
    `Date: ${draft.date}`,
    `Venue: ${draft.primaryVenue?.name}${draft.primaryVenue?.address ? ` (${draft.primaryVenue.address})` : ''}`,
  ]
  if (draft.secondaryVenues?.length) {
    lines.push(`Secondary: ${draft.secondaryVenues.map((v) => v.name ?? v.googleMapsLink).join(', ')}`)
  }
  lines.push(`Attendees: ${draft.attendees?.join(', ')}`)
  if (draft.guests?.length) lines.push(`Guests: ${draft.guests.join(', ')}`)
  if (draft.note) lines.push(`Note: ${draft.note}`)
  lines.push('', "Reply 'yes' to open a PR, or 'cancel' to discard.")
  return lines.join('\n')
}

function splitNames(text: string): string[] {
  return text
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
}

function advance(
  state: ConversationState,
  step: ConversationStep,
  draftPatch: Partial<EventDraft>,
  reply: string,
): ConversationResult {
  const nextState: ConversationState = {
    ...state,
    step,
    draft: { ...state.draft, ...draftPatch },
    updatedAt: Date.now(),
  }
  return { state: nextState, reply }
}

function parseDate(text: string): Date | null {
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return toValidDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
  }

  const dmyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    return toValidDate(Number(dmyMatch[3]), Number(dmyMatch[2]), Number(dmyMatch[1]))
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    return toValidDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate())
  }

  return null
}

function toValidDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day))
  const isValid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return isValid ? date : null
}
