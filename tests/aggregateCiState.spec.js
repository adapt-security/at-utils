import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import aggregateCiState from '../lib/utils/aggregateCiState.js'

const run = (over = {}) => ({
  head_sha: 'aaa',
  workflow_id: 1,
  name: 'Tests',
  status: 'completed',
  conclusion: 'success',
  created_at: '2026-06-17T12:00:00Z',
  html_url: 'https://example.com/run',
  ...over
})

describe('aggregateCiState', () => {
  it('returns none for no runs', () => {
    assert.deepEqual(aggregateCiState([]), { state: 'none', url: null, sha: null })
    assert.equal(aggregateCiState(undefined).state, 'none')
  })

  it('passes when all workflows for the latest commit succeed', () => {
    const runs = [
      run({ workflow_id: 1, name: 'Tests' }),
      run({ workflow_id: 2, name: 'Lint' }),
      run({ workflow_id: 3, name: 'Release' })
    ]
    assert.equal(aggregateCiState(runs).state, 'pass')
  })

  it('fails if any workflow for the latest commit fails (the multi-workflow case)', () => {
    const runs = [
      run({ workflow_id: 1, name: 'Tests', conclusion: 'failure', html_url: 'https://example.com/tests' }),
      run({ workflow_id: 2, name: 'Lint', conclusion: 'success' }),
      run({ workflow_id: 3, name: 'Release', conclusion: 'success' })
    ]
    const result = aggregateCiState(runs)
    assert.equal(result.state, 'failure')
    assert.equal(result.url, 'https://example.com/tests')
  })

  it('only considers the newest commit, ignoring older passing/failing runs', () => {
    const runs = [
      run({ head_sha: 'new', created_at: '2026-06-17T13:00:00Z', conclusion: 'success' }),
      run({ head_sha: 'old', created_at: '2026-06-17T10:00:00Z', conclusion: 'failure' })
    ]
    assert.equal(aggregateCiState(runs).state, 'pass')
  })

  it('resolves reruns to the latest run per workflow', () => {
    const runs = [
      run({ workflow_id: 1, created_at: '2026-06-17T12:30:00Z', conclusion: 'success' }),
      run({ workflow_id: 1, created_at: '2026-06-17T12:00:00Z', conclusion: 'failure' })
    ]
    assert.equal(aggregateCiState(runs).state, 'pass')
  })

  it('reports an in-progress run before judging conclusions', () => {
    const runs = [
      run({ workflow_id: 1, status: 'in_progress', conclusion: null }),
      run({ workflow_id: 2, conclusion: 'failure' })
    ]
    assert.equal(aggregateCiState(runs).state, 'in_progress')
  })

  it('treats neutral and skipped as passing', () => {
    const runs = [
      run({ workflow_id: 1, conclusion: 'skipped' }),
      run({ workflow_id: 2, conclusion: 'neutral' })
    ]
    assert.equal(aggregateCiState(runs).state, 'pass')
  })
})
