#!/usr/bin/env tsx
/**
 * Interactive local test harness for the Telegram venue-submission flow.
 * Drives the same conversation FSM the webhook uses, so you can try the
 * whole /newmeatup flow from a terminal before wiring up a real bot token.
 *
 * Google Maps links are resolved for real (live network fetch). Opening a
 * GitHub PR is dry-run by default (prints what would be committed); set
 * GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO to actually open one.
 *
 * Usage: pnpm telegram:simulate
 */
import { createInterface } from 'node:readline'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { handleMessage } from '../src/lib/telegram/conversation'
import { createConversation } from '../src/lib/telegram/types'
import { buildEventFromDraft, appendEventToYaml } from '../src/lib/telegram/eventBuilder'
import { createVenuePullRequest } from '../src/lib/telegram/github'

const EVENTS_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/content/events/events.yaml',
)

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'you> ' })
  let state = createConversation(0)

  console.log("Simulated Meat Up bot. Send /newmeatup to start, /cancel to abort, Ctrl+C to quit.\n")

  // Kick things off automatically so you don't have to type the command.
  const opening = await handleMessage(state, '/newmeatup')
  state = opening.state
  console.log(`bot> ${opening.reply}\n`)
  rl.prompt()

  // Lines can arrive faster than we process them (e.g. piped input in
  // tests), so chain each turn onto a promise queue rather than reading
  // one line at a time with question().
  let queue: Promise<void> = Promise.resolve()
  rl.on('line', (input) => {
    queue = queue.then(async () => {
      const result = await handleMessage(state, input)
      state = result.state
      if (result.reply) console.log(`\nbot> ${result.reply}\n`)

      if (result.completedDraft) {
        await submit(result.completedDraft)
        const restart = await handleMessage(state, '/newmeatup')
        state = restart.state
        console.log(`bot> ${restart.reply}\n`)
      }
      rl.prompt()
    })
  })

  rl.on('close', () => {
    queue.then(() => process.exit(0))
  })
}

async function submit(draft: Parameters<typeof buildEventFromDraft>[0]) {
  const event = buildEventFromDraft(draft)
  const { token, owner, repo } = {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
  }

  if (!token || !owner || !repo) {
    const currentYaml = await readFile(EVENTS_FILE, 'utf-8')
    console.log('--- DRY RUN (set GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO to open a real PR) ---')
    console.log(appendEventToYaml(currentYaml, event))
    console.log('--- end dry run ---\n')
    return
  }

  const branchName = `telegram-venue/${event.date.toISOString().slice(0, 10)}-${Date.now()}`
  const { url } = await createVenuePullRequest(
    { token, owner, repo, baseBranch: process.env.GITHUB_BASE_BRANCH || 'main' },
    {
      filePath: 'src/content/events/events.yaml',
      updater: (current) => appendEventToYaml(current, event),
      branchName,
      title: `Add meat up: ${event.primaryVenue.name} (${event.date.toISOString().slice(0, 10)})`,
      body: `Submitted via Telegram bot simulation.\n\nVenue: ${event.primaryVenue.name}\nAttendees: ${event.attendees.join(', ')}`,
    },
  )
  console.log(`Opened PR: ${url}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
