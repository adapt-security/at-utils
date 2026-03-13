import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import getCliRoot from '../lib/utils/getCliRoot.js'

describe('getCliRoot', () => {
  it('should return the package root directory', () => {
    const expected = resolve(import.meta.dirname, '..')
    assert.equal(getCliRoot(), expected)
  })
})
