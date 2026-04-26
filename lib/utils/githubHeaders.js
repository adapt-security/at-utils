export default function githubHeaders () {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'at-utils' }
  const { GITHUB_USER, GITHUB_TOKEN } = process.env
  if (GITHUB_USER && GITHUB_TOKEN) {
    headers.Authorization = `Basic ${Buffer.from(`${GITHUB_USER}:${GITHUB_TOKEN}`).toString('base64')}`
  }
  return headers
}
