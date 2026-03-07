import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import collectJsFiles from '../lib/utils/collectJsFiles.js'

describe('collectJsFiles', () => {
  let tmpDir

  before(() => {
    tmpDir = join(tmpdir(), `collectJsFiles-${Date.now()}`)
    mkdirSync(join(tmpDir, 'sub'), { recursive: true })
    writeFileSync(join(tmpDir, 'a.js'), '')
    writeFileSync(join(tmpDir, 'b.js'), '')
    writeFileSync(join(tmpDir, 'c.txt'), '')
    writeFileSync(join(tmpDir, 'sub', 'd.js'), '')
    writeFileSync(join(tmpDir, 'sub', 'e.json'), '')
  })

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('#collectJsFiles()', () => {
    it('should return an array', () => {
      assert.ok(Array.isArray(collectJsFiles(tmpDir)))
    })

    it('should collect .js files at root level', () => {
      const files = collectJsFiles(tmpDir)
      assert.ok(files.some(f => f.endsWith('a.js')))
      assert.ok(files.some(f => f.endsWith('b.js')))
    })

    it('should collect .js files in subdirectories', () => {
      const files = collectJsFiles(tmpDir)
      assert.ok(files.some(f => f.endsWith('d.js')))
    })

    it('should not include non-.js files', () => {
      const files = collectJsFiles(tmpDir)
      assert.ok(!files.some(f => f.endsWith('.txt')))
      assert.ok(!files.some(f => f.endsWith('.json')))
    })

    it('should return empty array for empty directory', () => {
      const emptyDir = join(tmpdir(), `collectJs-empty-${Date.now()}`)
      mkdirSync(emptyDir, { recursive: true })
      try {
        assert.deepEqual(collectJsFiles(emptyDir), [])
      } finally {
        rmSync(emptyDir, { recursive: true, force: true })
      }
    })
  })
})
