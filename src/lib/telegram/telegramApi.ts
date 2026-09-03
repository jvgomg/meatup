export interface TelegramClientConfig {
  botToken: string
  fetchImpl?: typeof fetch
}

export function createTelegramClient({ botToken, fetchImpl = fetch }: TelegramClientConfig) {
  const base = `https://api.telegram.org/bot${botToken}`

  return {
    async sendMessage(chatId: number, text: string): Promise<void> {
      const response = await fetchImpl(`${base}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      })
      if (!response.ok) {
        throw new Error(`Telegram sendMessage failed: ${response.status} ${await response.text()}`)
      }
    },
  }
}

export type TelegramClient = ReturnType<typeof createTelegramClient>

export interface TelegramUpdate {
  message?: {
    chat: { id: number }
    text?: string
  }
}

export function extractIncomingMessage(update: TelegramUpdate): { chatId: number; text: string } | null {
  const message = update.message
  if (!message?.text) return null
  return { chatId: message.chat.id, text: message.text }
}
