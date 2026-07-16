import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Langcheck from '../bin/lang-check.js'
import { reconcileLangKeys } from '../lib/utils/reconcileLangKeys.js'

async function withRoot (build, run) {
  // interpolating root into a glob pattern would parse '[id]' as a char class
  const root = join(tmpdir(), `lang-check-root[id]-${Date.now()}-${process.hrtime()[1]}`)
  try {
    build(root)
    return await run(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function writeJson (dir, name, obj) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), JSON.stringify(obj))
}

describe('Langcheck', () => {
  describe('#getTranslatedStrings()', () => {
    it('should collect strings when the root contains glob-significant characters', async () => {
      await withRoot(
        root => writeJson(join(root, 'adapt-authoring-foo', 'lang', 'en'), 'app.json', { title: 'x' }),
        async root => {
          const keyMap = await Langcheck.prototype.getTranslatedStrings(root)
          assert.deepEqual(keyMap.en, { 'app.title': false })
        }
      )
    })

    it('should collect strings from scoped modules', async () => {
      await withRoot(
        root => writeJson(join(root, '@scope', 'adapt-authoring-bar', 'lang', 'en'), 'app.json', { save: 'Save' }),
        async root => {
          const keyMap = await Langcheck.prototype.getTranslatedStrings(root)
          assert.deepEqual(keyMap.en, { 'app.save': false })
        }
      )
    })
  })

  describe('#getDeclaredKeys()', () => {
    it('should collect declared string keys across scoped and unscoped modules', async () => {
      await withRoot(
        root => {
          writeJson(join(root, 'adapt-authoring-foo', 'strings'), 'strings.json', { 'app.a': { description: 'A' }, 'app.fam': { pattern: true } })
          writeJson(join(root, '@scope', 'adapt-authoring-bar', 'strings'), 'strings.json', { 'app.b': {} })
        },
        async root => {
          const declared = await Langcheck.prototype.getDeclaredKeys(root)
          assert.deepEqual(Object.keys(declared).sort(), ['app.a', 'app.b', 'app.fam'])
          assert.equal(declared['app.fam'].pattern, true)
        }
      )
    })
  })

  describe('#isDeclared()', () => {
    it('should match exact keys and pattern prefixes', () => {
      const lc = Langcheck.prototype
      const declared = { 'app.exact': {}, 'app.fam': { pattern: true } }
      assert.equal(lc.isDeclared('app.exact', declared), true)
      assert.equal(lc.isDeclared('app.famchild', declared), true)
      assert.equal(lc.isDeclared('app.other', declared), false)
    })
  })

  describe('reconciliation over a fixture install', () => {
    it('reports missing/orphan for app.* and ignores error.* entirely', async () => {
      await withRoot(
        root => {
          writeJson(join(root, 'adapt-authoring-foo', 'strings'), 'strings.json', { 'app.a': {}, 'app.fam': { pattern: true } })
          writeJson(join(root, '@scope', 'adapt-authoring-bar', 'lang', 'en'), 'app.json', { a: 'A', extra: 'E' })
          writeJson(join(root, '@scope', 'adapt-authoring-bar', 'lang', 'en'), 'error.json', { BOOM: 'boom' })
        },
        async root => {
          const declared = await Langcheck.prototype.getDeclaredKeys(root)
          const translatedStrings = await Langcheck.prototype.getTranslatedStrings(root)
          const translated = Object.keys(translatedStrings.en).filter(k => !k.startsWith('error.'))
          const { missing, orphan } = reconcileLangKeys({ declared, translated })
          assert.deepEqual(missing.sort(), ['app.fam'])
          assert.deepEqual(orphan.sort(), ['app.extra'])
        }
      )
    })
  })
})
