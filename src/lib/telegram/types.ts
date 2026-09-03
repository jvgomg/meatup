export type ConversationStep =
  | 'idle'
  | 'ask_date'
  | 'ask_maps_link'
  | 'confirm_venue'
  | 'ask_venue_name'
  | 'ask_venue_address'
  | 'ask_secondary_venue'
  | 'ask_attendees'
  | 'ask_guests'
  | 'ask_note'
  | 'confirm'

export interface VenueDraft {
  name?: string
  address?: string
  googleMapsLink?: string
}

export interface EventDraft {
  date?: string
  primaryVenue?: VenueDraft
  secondaryVenues?: VenueDraft[]
  attendees?: string[]
  guests?: string[]
  note?: string
}

export interface ConversationState {
  chatId: number
  step: ConversationStep
  draft: EventDraft
  updatedAt: number
}

export function createConversation(chatId: number): ConversationState {
  return { chatId, step: 'idle', draft: {}, updatedAt: Date.now() }
}
