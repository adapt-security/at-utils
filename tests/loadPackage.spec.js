import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import loadPackage from '../lib/utils/loadPackage.js'

describe('loadPackage', () => {
  let tmpDir

  before(() => {
    tmpDir = join(tmpdir(), `loadPackage-${Date.now()}`)
    mkdirSync(join(tmpDir, 'valid-pkg'), { recursive: true })
    writeFileSync(
      join(tmpDir, 'valid-pkg', 'package.json'),
      JSON.stringify({ name: 'my-module', version: '1.0.0' })
    )
    mkdirSync(join(tmpDir, 'bad-pkg'), { recursive: true })
    writeFileSync(join(tmpDir, 'bad-pkg', 'package.json'), 'not-json {')
  })

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('#loadPackage()', () => {
    it('should load and parse package.json from a directory', async () => {
      const result = await loadPackage(join(tmpDir, 'valid-pkg'))
      assert.deepEqual(result, { name: 'my-module', version: '1.0.0' })
    })

    it('should throw when package.json contains invalid JSON', async () => {
      await assert.rejects(loadPackage(join(tmpDir, 'bad-pkg')), { name: 'Error' })
    })

    it('should throw when the directory does not contain package.json', async () => {
      await assert.rejects(loadPackage(join(tmpDir, 'no-pkg')), { name: 'Error' })
    })
  })
})
