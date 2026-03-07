import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import getModuleDirs from '../lib/utils/getModuleDirs.js'

describe('getModuleDirs', () => {
  let tmpDir

  before(() => {
    tmpDir = join(tmpdir(), `getModuleDirs-${Date.now()}`)
    mkdirSync(join(tmpDir, 'module-a'), { recursive: true })
    writeFileSync(join(tmpDir, 'module-a', 'adapt-authoring.json'), '{}')
    mkdirSync(join(tmpDir, 'module-b'), { recursive: true })
    writeFileSync(join(tmpDir, 'module-b', 'adapt-authoring.json'), '{}')
    mkdirSync(join(tmpDir, 'not-a-module'), { recursive: true })
  })

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('#getModuleDirs()', () => {
    it('should return an array', () => {
      assert.ok(Array.isArray(getModuleDirs(tmpDir)))
    })

    it('should include directories that contain adapt-authoring.json', () => {
      const result = getModuleDirs(tmpDir)
      assert.ok(result.includes(join(tmpDir, 'module-a')))
      assert.ok(result.includes(join(tmpDir, 'module-b')))
    })

    it('should not include directories without adapt-authoring.json', () => {
      const result = getModuleDirs(tmpDir)
      assert.ok(!result.includes(join(tmpDir, 'not-a-module')))
    })

    it('should return empty array when no modules are present', () => {
      const emptyDir = join(tmpdir(), `getModuleDirs-empty-${Date.now()}`)
      mkdirSync(emptyDir, { recursive: true })
      try {
        assert.deepEqual(getModuleDirs(emptyDir), [])
      } finally {
        rmSync(emptyDir, { recursive: true, force: true })
      }
    })
  })
})
