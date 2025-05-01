export default async function githubRequest (endpoint, opts = {}) {
  const { GITHUB_USER, GITHUB_TOKEN } = process.env

  if (GITHUB_USER && GITHUB_TOKEN) {
    const authHash = Buffer.from(`${GITHUB_USER}:${GITHUB_TOKEN}`).toString('base64')
    opts.headers = { Authorization: `Basic ${authHash}` }
  }
  const response = await fetch(`https://api.github.com/repos/adapt-security/adapt-authoring/${endpoint}`, opts)
  if (response.status > 299) {
    throw new Error(response.statusText)
  }
  if (response.status !== 204) return response.json()
}
