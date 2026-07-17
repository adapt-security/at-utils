import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { reconcileLangKeys } from '../lib/utils/reconcileLangKeys.js'

describe('reconcileLangKeys()', () => {
  const cases = [
    {
      name: 'flags declared keys with no translation as missing',
      declared: { 'app.a': {}, 'app.b': {} },
      translated: ['app.a'],
      missing: ['app.b'],
      orphan: []
    },
    {
      name: 'flags translated keys nothing declares as orphan',
      declared: { 'app.a': {} },
      translated: ['app.a', 'app.b'],
      missing: [],
      orphan: ['app.b']
    },
    {
      name: 'a pattern entry is satisfied by any prefix-matching translation',
      declared: { 'app.layout': { pattern: true } },
      translated: ['app.layoutfull', 'app.layouthalf'],
      missing: [],
      orphan: []
    },
    {
      name: 'a pattern entry with no matching translation is missing',
      declared: { 'app.preset_': { pattern: true } },
      translated: ['app.other'],
      missing: ['app.preset_'],
      orphan: ['app.other']
    },
    {
      name: 'treats error codes fed as declared like any other key',
      declared: { 'error.DUPL': {}, 'error.GONE': {} },
      translated: ['error.DUPL', 'error.ORPHAN'],
      missing: ['error.GONE'],
      orphan: ['error.ORPHAN']
    }
  ]

  for (const c of cases) {
    it(c.name, () => {
      const { missing, orphan } = reconcileLangKeys({ declared: c.declared, translated: c.translated })
      assert.deepEqual(missing.sort(), c.missing.sort())
      assert.deepEqual(orphan.sort(), c.orphan.sort())
    })
  }
})
