import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import ciStatusEmoji from '../lib/utils/ciStatusEmoji.js'

describe('ciStatusEmoji', () => {
  const cases = [
    ['pass', '✅'],
    ['failure', '❌'],
    ['cancelled', '❌'],
    ['in_progress', '🟡'],
    ['none', '⚪️'],
    ['error', '⚠️'],
    ['something-unexpected', '❔']
  ]
  for (const [state, expected] of cases) {
    it(`maps '${state}'`, () => assert.equal(ciStatusEmoji(state), expected))
  }
})
