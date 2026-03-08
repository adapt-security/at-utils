import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import isModule from '../lib/utils/isModule.js'

describe('isModule', () => {
  let tmpDir

  before(() => {
    tmpDir = join(tmpdir(), `isModule-${Date.now()}`)
    mkdirSync(join(tmpDir, 'valid'), { recursive: true })
    writeFileSync(join(tmpDir, 'valid', 'adapt-authoring.json'), '{}')
    mkdirSync(join(tmpDir, 'invalid'), { recursive: true })
  })

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('#isModule()', () => {
    it('should return true for directory with adapt-authoring.json', () => {
      assert.equal(isModule(join(tmpDir, 'valid')), true)
    })

    it('should return false for directory without adapt-authoring.json', () => {
      assert.equal(isModule(join(tmpDir, 'invalid')), false)
    })

    it('should return false for non-existent directory', () => {
      assert.equal(isModule(join(tmpDir, 'does-not-exist')), false)
    })
  })
})
