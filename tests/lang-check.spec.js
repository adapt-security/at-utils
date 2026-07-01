import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Langcheck from '../bin/lang-check.js'

describe('Langcheck', () => {
  describe('#getTranslatedStrings()', () => {
    it('should collect strings when the root contains glob-significant characters', async () => {
      // interpolating root into the pattern would parse '[id]' as a char class (and '\' as an escape on Windows)
      const root = join(tmpdir(), `lang-check-root[id]-${Date.now()}`)
      const langDir = join(root, 'adapt-authoring-foo', 'lang', 'en')
      try {
        mkdirSync(langDir, { recursive: true })
        writeFileSync(join(langDir, 'app.json'), JSON.stringify({ title: 'x' }))
        const keyMap = await Langcheck.prototype.getTranslatedStrings(root)
        assert.deepEqual(keyMap.en, { 'app.title': false })
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    })
  })
})
