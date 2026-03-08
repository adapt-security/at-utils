export default async function githubRequest (endpoint, opts = {}) {
  const { GITHUB_USER, GITHUB_TOKEN } = process.env

  if (GITHUB_USER && GITHUB_TOKEN) {
    const authHash = Buffer.from(`${GITHUB_USER}:${GITHUB_TOKEN}`).toString('base64')
    opts.headers = { Authorization: `Basic ${authHash}` }
  }
  const response = await fetch(`https://api.github.com/repos/adapt-security/adapt-authoring/${endpoint}`, opts)
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
