export default function parseRepoSlug (url) {
  const match = url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)
  if (!match) throw new Error(`Could not parse a GitHub repo from URL: ${url}`)
  return match[1]
}
