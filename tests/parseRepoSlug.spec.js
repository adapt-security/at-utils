import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parseRepoSlug from '../lib/utils/parseRepoSlug.js'

describe('parseRepoSlug', () => {
  const cases = [
    ['git@github.com:adapt-security/adapt-authoring-core.git', 'adapt-security/adapt-authoring-core'],
    ['git@github.com:cgkineo/adapt-authoring-collab.git', 'cgkineo/adapt-authoring-collab'],
    ['https://github.com/adaptlearning/adapt-cli.git', 'adaptlearning/adapt-cli'],
    ['https://github.com/adaptlearning/adapt-cli', 'adaptlearning/adapt-cli']
  ]
  for (const [url, expected] of cases) {
    it(`parses ${url}`, () => assert.equal(parseRepoSlug(url), expected))
  }

  it('throws on a non-GitHub URL', () => {
    assert.throws(() => parseRepoSlug('https://example.com/foo/bar'), /Could not parse/)
  })
})
