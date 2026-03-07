import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import loadJson from '../lib/utils/loadJson.js'

describe('loadJson', () => {
  let tmpDir

  before(() => {
    tmpDir = join(tmpdir(), `loadJson-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(join(tmpDir, 'valid.json'), JSON.stringify({ key: 'value', num: 42 }))
    writeFileSync(join(tmpDir, 'invalid.json'), 'not valid json {')
  })

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('#loadJson()', () => {
    it('should parse a valid JSON file', async () => {
      const result = await loadJson(join(tmpDir, 'valid.json'))
      assert.deepEqual(result, { key: 'value', num: 42 })
    })

    it('should throw an Error for invalid JSON', async () => {
      await assert.rejects(loadJson(join(tmpDir, 'invalid.json')), { name: 'Error' })
    })

    it('should throw an Error for a non-existent file', async () => {
      await assert.rejects(loadJson(join(tmpDir, 'missing.json')), { name: 'Error' })
    })

    it('should include the file path in the error message', async () => {
      const filePath = join(tmpDir, 'missing.json')
      await assert.rejects(loadJson(filePath), (err) => {
        assert.ok(err.message.includes(filePath))
        return true
      })
    })
  })
})
