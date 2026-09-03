export interface GithubConfig {
  token: string
  owner: string
  repo: string
  baseBranch?: string
  fetchImpl?: typeof fetch
}

export interface CreateVenuePrInput {
  filePath: string
  /** Receives the file's current content straight from GitHub and returns the new content to commit. */
  updater: (currentContent: string) => string
  branchName: string
  title: string
  body: string
}

export interface CreateVenuePrResult {
  url: string
  number: number
}

const API_ROOT = 'https://api.github.com'

/**
 * Creates a branch off the base branch, commits the updated events.yaml to
 * it, and opens a pull request — so a submitted venue lands as a reviewable
 * PR rather than going straight to the live site.
 */
export async function createVenuePullRequest(
  config: GithubConfig,
  input: CreateVenuePrInput,
): Promise<CreateVenuePrResult> {
  const fetchImpl = config.fetchImpl ?? fetch
  const baseBranch = config.baseBranch ?? 'main'
  const headers = {
    Authorization: `Bearer ${config.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }

  const repoPath = `${config.owner}/${config.repo}`

  const baseRef = await request<{ object: { sha: string } }>(
    fetchImpl,
    `${API_ROOT}/repos/${repoPath}/git/ref/heads/${baseBranch}`,
    { headers },
  )

  await request(fetchImpl, `${API_ROOT}/repos/${repoPath}/git/refs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ref: `refs/heads/${input.branchName}`, sha: baseRef.object.sha }),
  })

  const existingFile = await request<{ sha: string; content: string }>(
    fetchImpl,
    `${API_ROOT}/repos/${repoPath}/contents/${input.filePath}?ref=${baseBranch}`,
    { headers },
  )
  const currentContent = base64Decode(existingFile.content)
  const updatedContent = input.updater(currentContent)

  await request(fetchImpl, `${API_ROOT}/repos/${repoPath}/contents/${input.filePath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: input.title,
      content: base64Encode(updatedContent),
      sha: existingFile.sha,
      branch: input.branchName,
    }),
  })

  const pr = await request<{ html_url: string; number: number }>(
    fetchImpl,
    `${API_ROOT}/repos/${repoPath}/pulls`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        head: input.branchName,
        base: baseBranch,
      }),
    },
  )

  return { url: pr.html_url, number: pr.number }
}

async function request<T>(fetchImpl: typeof fetch, url: string, init: RequestInit): Promise<T> {
  const response = await fetchImpl(url, init)
  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status} ${url}): ${await response.text()}`)
  }
  return (await response.json()) as T
}

function base64Encode(text: string): string {
  return Buffer.from(text, 'utf-8').toString('base64')
}

function base64Decode(base64: string): string {
  return Buffer.from(base64, 'base64').toString('utf-8')
}
