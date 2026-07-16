import CliCommand from '../lib/CliCommand.js'
import { reconcileLangKeys } from '../lib/utils/reconcileLangKeys.js'
import fs from 'node:fs/promises'
import { glob } from 'glob'
import path from 'node:path'

// match both unscoped (adapt-authoring-*) and scoped (@scope/adapt-authoring-*) modules
const modulePattern = sub => ['adapt-authoring-*/' + sub, '@*/adapt-authoring-*/' + sub]

export default class Langcheck extends CliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Checks that declared language keys have translations (and vice versa)'
    }
  }

  async runTask () {
    const root = `${process.cwd().replaceAll(path.sep, '/')}/node_modules`

    this.underline('Language String Check')

    const declared = await this.getDeclaredKeys(root)
    const translatedStrings = await this.getTranslatedStrings(root)
    const usedInCode = await this.getUsedInCode(root)

    console.log('\n  Languages found:')
    Object.keys(translatedStrings).forEach(l => console.log('  -', l))

    for (const lang of Object.keys(translatedStrings)) {
      console.log('\n')
      this.underline(`Language: ${lang}`.toUpperCase())

      // error strings are out of scope — they are handled by the error registry
      const translated = Object.keys(translatedStrings[lang]).filter(k => !k.startsWith('error.'))
      const { missing, orphan } = reconcileLangKeys({ declared, translated })

      console.log()
      // missing translations are a real defect (the raw key would be shown) — these fail the check
      if (missing.length) {
        this.logStrings(missing, 'declared keys without a translation')
        console.log()
      }
      // orphaned translations are hygiene (unused, or a dynamic key not declared) — warn only
      if (orphan.length) {
        this.logWarning(orphan, 'translated keys no module declares')
        console.log()
      }
      if (!missing.length && !orphan.length) {
        console.log('✓ No issues found!\n')
      }
      this.underline(`Summary:\n  - ${missing.length} missing translations (fail)\n  - ${orphan.length} orphaned translations (warn)`)
    }

    const undeclaredUsed = [...usedInCode].filter(key => !this.isDeclared(key, declared))
    if (undeclaredUsed.length) {
      console.log('\n')
      this.logWarning(undeclaredUsed, 'key(s) used in code but not declared in any strings/*.json')
    }
    console.log()
  }

  underline (s = '', topLine = true) {
    const line = ''.padEnd(80, '-')
    console.log(`${topLine ? line + '\n' : ''}  ${s}\n${line}`)
  }

  isDeclared (key, declared) {
    if (declared[key]) return true
    return Object.entries(declared).some(([dk, def]) => def?.pattern && key.startsWith(dk))
  }

  async getDeclaredKeys (root) {
    const declared = {}
    const stringFiles = await glob(modulePattern('strings/*.json'), { cwd: root, absolute: true })
    await Promise.all(stringFiles.map(async f => {
      const contents = JSON.parse(await fs.readFile(f))
      Object.entries(contents).forEach(([k, v]) => {
        if (!declared[k]) declared[k] = v && typeof v === 'object' ? v : {}
      })
    }))
    return declared
  }

  async getTranslatedStrings (root) {
    const langPacks = await glob(modulePattern('lang'), { cwd: root, absolute: true })
    const keyMap = {}
    await Promise.all(langPacks.map(async langDir => {
      const files = await glob('**/*.json', { cwd: langDir, absolute: true })
      await Promise.all(files.map(async f => {
        const keys = JSON.parse(await fs.readFile(f))
        const relative = path.relative(langDir, f)
        const parts = relative.replace(/\.json$/, '').split(path.sep)
        const lang = parts[0]
        const prefix = parts.length > 1 ? parts.slice(1).join('.') + '.' : ''
        if (!keyMap[lang]) keyMap[lang] = {}
        Object.keys(keys).forEach(k => {
          keyMap[lang][`${prefix}${k}`] = false
        })
      }))
    }))
    return keyMap
  }

  async getUsedInCode (root) {
    const used = new Set()
    const sourceFiles = await glob(modulePattern('**/*.@(js|hbs)'), { cwd: root, absolute: true, ignore: ['**/node_modules/**', '**/*.spec.js', '**/tests/**'] })
    await Promise.all(sourceFiles.map(async f => {
      const contents = (await fs.readFile(f)).toString()
      for (const m of contents.matchAll(/(['"`])(app\.[\w.]+)\1/g)) {
        if (m[2] !== 'app.js') used.add(m[2])
      }
    }))
    return used
  }

  logStrings (strings, message) {
    if (!strings.length) {
      return console.log(`✓ No ${message}`)
    }
    this.underline(`Found ${strings.length} ${message}`)
    console.log(`${[...strings].sort().map(s => `\n- ${s}`).join('')}`)
    process.exitCode = 1
  }

  logWarning (strings, message) {
    this.underline(`Warning: ${strings.length} ${message}`)
    console.log(`${[...strings].sort().map(s => `\n- ${s}`).join('')}`)
  }
}
