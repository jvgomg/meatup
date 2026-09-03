# Telegram venue-submission bot

Lets you DM a Telegram bot to add a new meat up: it asks for the date, a
Google Maps link (auto-extracting the venue name/address where it can),
optional secondary/pre-drinks venues, attendees, guests and a note — then
opens a GitHub PR against `src/content/events/events.yaml` for review.

## How it works

- `src/pages/api/telegram-webhook.ts` — the webhook Astro receives Telegram
  updates on (`prerender = false`, so it's an on-demand Vercel function
  rather than a static page).
- `src/lib/telegram/conversation.ts` — the actual conversation state machine
  (pure function of `(state, message text) -> (new state, reply)`), fully
  unit tested in `conversation.test.ts` and independent of Telegram/GitHub.
- `src/lib/telegram/googleMaps.ts` — best-effort venue name/address
  extraction from a Google Maps link (follows short-link redirects, reads
  `og:title`/`og:description`). Maps pages are heavily JS-rendered, so
  extraction can come back partial or empty — the conversation always lets
  you confirm or override what it found.
- `src/lib/telegram/eventBuilder.ts` — validates a finished draft against
  the same schema as the content collection, and inserts it into
  `events.yaml` in date order without reformatting the rest of the file.
- `src/lib/telegram/github.ts` — opens the branch + commit + PR via the
  GitHub REST API (no `@octokit` dependency, just `fetch`).
- `src/lib/telegram/conversationStore.ts` — where per-chat conversation
  state lives. **Currently an in-memory `Map`**, which only survives for
  the life of one serverless instance — see "Known limitation" below.

## Testing without a live bot

```
pnpm test                # unit tests for the FSM, maps parsing, yaml builder
pnpm telegram:simulate    # interactive terminal chat that drives the real FSM
```

`pnpm telegram:simulate` resolves Google Maps links for real (live network
call) but dry-runs the GitHub step by default — it prints the diff it would
have committed instead of opening a PR, so you can try the whole flow with
no credentials at all.

## What's left to wire up (do this "on your machine")

1. **Create the bot.** Message [@BotFather](https://t.me/BotFather) on
   Telegram, `/newbot`, get the bot token.
2. **Find your chat ID.** DM your new bot anything, then hit
   `https://api.telegram.org/bot<TOKEN>/getUpdates` — `message.chat.id` in
   the response is your chat ID.
3. **Set environment variables** (in Vercel project settings, and in a
   local `.env` for `astro dev`):

   | Variable | Purpose |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
   | `TELEGRAM_WEBHOOK_SECRET` | Random string; Telegram echoes it back in a header so the endpoint can reject spoofed requests |
   | `TELEGRAM_ALLOWED_CHAT_ID` | Your chat ID from step 2 — messages from anyone else are silently ignored |
   | `GITHUB_TOKEN` | A token (fine-grained PAT scoped to just this repo, contents+PRs read/write) so the bot can open PRs |
   | `GITHUB_OWNER` / `GITHUB_REPO` | This repo's owner/name |
   | `GITHUB_BASE_BRANCH` | Optional, defaults to `main` |

4. **Register the webhook** once it's deployed:
   ```
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://meatup.fun/api/telegram-webhook" \
     -d "secret_token=<same value as TELEGRAM_WEBHOOK_SECRET>"
   ```
5. **Message the bot** with `/newmeatup` and follow the prompts.

## Known limitation: conversation state in production

`InMemoryConversationStore` keeps state in a plain `Map`, keyed by chat ID.
That's fine for `pnpm telegram:simulate` and for a single long-lived
process, but Vercel functions are stateless between invocations — a real
deployment needs conversation state to survive from one Telegram message to
the next, potentially on a different function instance.

Before relying on this in production, swap in a persistent
`ConversationStore` (same two-method interface in
`src/lib/telegram/conversationStore.ts`) backed by something like Vercel KV
or Upstash Redis, and use it in `src/pages/api/telegram-webhook.ts` instead
of `InMemoryConversationStore`.
