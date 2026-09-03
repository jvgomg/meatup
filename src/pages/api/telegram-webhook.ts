import type { APIRoute } from 'astro'
import { InMemoryConversationStore } from '../../lib/telegram/conversationStore'
import { handleMessage } from '../../lib/telegram/conversation'
import { extractIncomingMessage, createTelegramClient, type TelegramUpdate } from '../../lib/telegram/telegramApi'
import { buildEventFromDraft, appendEventToYaml } from '../../lib/telegram/eventBuilder'
import { createVenuePullRequest } from '../../lib/telegram/github'

export const prerender = false

// NOTE: this Map only survives for the lifetime of one serverless instance.
// See src/lib/telegram/conversationStore.ts for why, and what to swap in
// before relying on this in production.
const store = new InMemoryConversationStore()

const EVENTS_FILE_PATH = 'src/content/events/events.yaml'

export const POST: APIRoute = async ({ request }) => {
  const secretHeader = request.headers.get('x-telegram-bot-api-secret-token')
  const expectedSecret = import.meta.env.TELEGRAM_WEBHOOK_SECRET
  if (expectedSecret && secretHeader !== expectedSecret) {
    return new Response('Forbidden', { status: 403 })
  }

  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return new Response('Bot not configured', { status: 500 })
  }

  const update = (await request.json()) as TelegramUpdate
  const incoming = extractIncomingMessage(update)
  if (!incoming) {
    // Non-text updates (stickers, edits, etc.) - nothing to do.
    return new Response('OK', { status: 200 })
  }

  const allowedChatId = import.meta.env.TELEGRAM_ALLOWED_CHAT_ID
  if (allowedChatId && String(incoming.chatId) !== allowedChatId) {
    return new Response('OK', { status: 200 })
  }

  const telegram = createTelegramClient({ botToken })
  const state = await store.get(incoming.chatId)
  const result = await handleMessage(state, incoming.text)
  await store.save(result.state)

  if (result.reply) {
    await telegram.sendMessage(incoming.chatId, result.reply)
  }

  if (result.completedDraft) {
    try {
      const prUrl = await submitVenuePr(result.completedDraft)
      await telegram.sendMessage(incoming.chatId, `PR opened: ${prUrl}`)
    } catch (error) {
      await telegram.sendMessage(
        incoming.chatId,
        `Couldn't open the PR (${error instanceof Error ? error.message : 'unknown error'}). The details aren't saved - you'll need to run /newmeatup again.`,
      )
    }
  }

  return new Response('OK', { status: 200 })
}

async function submitVenuePr(draft: Parameters<typeof buildEventFromDraft>[0]): Promise<string> {
  const token = import.meta.env.GITHUB_TOKEN
  const owner = import.meta.env.GITHUB_OWNER
  const repo = import.meta.env.GITHUB_REPO
  if (!token || !owner || !repo) {
    throw new Error('GitHub integration is not configured (GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO)')
  }

  const event = buildEventFromDraft(draft)
  const branchName = `telegram-venue/${event.date.toISOString().slice(0, 10)}-${Date.now()}`

  const { url } = await createVenuePullRequest(
    { token, owner, repo, baseBranch: import.meta.env.GITHUB_BASE_BRANCH || 'main' },
    {
      filePath: EVENTS_FILE_PATH,
      updater: (current) => appendEventToYaml(current, event),
      branchName,
      title: `Add meat up: ${event.primaryVenue.name} (${event.date.toISOString().slice(0, 10)})`,
      body: `Submitted via Telegram bot.\n\nVenue: ${event.primaryVenue.name}\nAttendees: ${event.attendees.join(', ')}`,
    },
  )

  return url
}
