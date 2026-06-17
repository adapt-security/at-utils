const PASS_CONCLUSIONS = new Set(['success', 'neutral', 'skipped'])

// Given the recent Actions runs for a branch (newest first), computes a single
// CI state for the most recent commit that ran CI — the newest run's head_sha —
// aggregating across every workflow triggered for that commit. Reruns are
// resolved to the latest run per workflow. A single push commonly triggers
// several workflows, so the latest run alone is not a reliable signal.
//
// Returns { state, url, sha } where state is:
//   none | <status> (e.g. in_progress) | pass | <conclusion> (e.g. failure)
export default function aggregateCiState (runs) {
  if (!runs || runs.length === 0) return { state: 'none', url: null, sha: null }

  const newest = runs.reduce((a, b) => b.created_at > a.created_at ? b : a)
  const sha = newest.head_sha

  const latestPerWorkflow = new Map()
  for (const run of runs) {
    if (run.head_sha !== sha) continue
    const key = run.workflow_id ?? run.name
    const current = latestPerWorkflow.get(key)
    if (!current || run.created_at > current.created_at) latestPerWorkflow.set(key, run)
  }
  const relevant = [...latestPerWorkflow.values()]

  const incomplete = relevant.find(run => run.status !== 'completed')
  if (incomplete) return { state: incomplete.status, url: incomplete.html_url, sha }

  const failed = relevant.find(run => !PASS_CONCLUSIONS.has(run.conclusion))
  if (failed) return { state: failed.conclusion || 'unknown', url: failed.html_url, sha }

  return { state: 'pass', url: newest.html_url, sha }
}
