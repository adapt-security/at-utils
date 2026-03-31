import githubHeaders from './githubHeaders.js'

const DEFAULT_REPO = 'adapt-security/adapt-authoring'

export default async function githubRequest (endpoint, opts = {}) {
  const repo = opts.repo || DEFAULT_REPO
  delete opts.repo
  opts.headers = { ...githubHeaders(), ...opts.headers }
  const response = await fetch(`https://api.github.com/repos/${repo}/${endpoint}`, opts)
  if (response.status > 299) {
    const isRateLimit = response.status === 429 ||
      (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0')
    if (isRateLimit) {
      const resetTime = response.headers.get('X-RateLimit-Reset')
      const resetMsg = resetTime ? ` Rate limit resets at ${new Date(resetTime * 1000).toUTCString()}.` : '' // resetTime is Unix epoch (seconds)
      throw new Error(`GitHub API rate limit exceeded.${resetMsg} You can set the GITHUB_USER and GITHUB_TOKEN environment variables to increase your rate limit.`)
    }
    let errorMessage = response.statusText
    try {
      const body = await response.json()
      if (body.message) errorMessage = body.message
    } catch (e) {} // body may not be valid JSON; fall back to statusText
    throw new Error(errorMessage)
  }
  if (response.status !== 204) return response.json()
}
