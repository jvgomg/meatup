import type { ConversationState } from './types'
import { createConversation } from './types'

export interface ConversationStore {
  get(chatId: number): Promise<ConversationState>
  save(state: ConversationState): Promise<void>
}

/**
 * Keeps conversation state in a process-local Map. Fine for local dev/testing
 * and for a single long-lived server process, but a serverless deployment
 * (e.g. Vercel functions) spins up fresh instances per invocation, so state
 * won't reliably survive between messages there. Swap this out for a
 * Vercel KV / Upstash Redis-backed ConversationStore before wiring up the
 * real webhook in production — same interface, just persist get/save.
 */
export class InMemoryConversationStore implements ConversationStore {
  private readonly states = new Map<number, ConversationState>()

  async get(chatId: number): Promise<ConversationState> {
    return this.states.get(chatId) ?? createConversation(chatId)
  }

  async save(state: ConversationState): Promise<void> {
    this.states.set(state.chatId, state)
  }
}
