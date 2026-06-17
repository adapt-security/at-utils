const EMOJI = {
  pass: '✅',
  failure: '❌',
  cancelled: '❌',
  timed_out: '❌',
  startup_failure: '❌',
  action_required: '❌',
  in_progress: '🟡',
  queued: '🟡',
  requested: '🟡',
  waiting: '🟡',
  pending: '🟡',
  none: '⚪️',
  error: '⚠️'
}

export default function ciStatusEmoji (state) {
  return EMOJI[state] || '❔'
}
