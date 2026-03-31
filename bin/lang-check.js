import CliCommand from '../lib/CliCommand.js'
import fs from 'node:fs/promises'
import { glob } from 'glob'
import path from 'node:path'

export default class Langcheck extends CliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Checks for unused and missing language strings'
    }
  }

  async runTask () {
    const root = `${process.cwd().replaceAll(path.sep, '/')}/node_modules`

    this.underline('Language String Check')

    const translatedStrings = await this.getTranslatedStrings(root)
    console.log('\n  Languages found:')
    Object.keys(translatedStrings).forEach(l => console.log('  -', l))

    for (const lang of Object.keys(translatedStrings)) {
      console.log('\n')
      this.underline(`Language: ${lang}`.toUpperCase())

      const langStrings = translatedStrings[lang]
      const usedStrings = await this.getUsedStrings(root, langStrings)
      const unusedStrings = Object.entries(langStrings).filter(([k, v]) => !k.startsWith('error.') && !v).map(([k]) => k)
      const missingStrings = Object.entries(usedStrings)
        .filter(([key]) => !langStrings[key] && !key.startsWith('error') && key !== 'app.js')
        .map(([key, locations]) => `${key}${locations}`)

      console.log()
      if (unusedStrings.length) {
        this.logStrings(unusedStrings, 'translated strings unreferenced in the code')
        console.log()
      }
      if (missingStrings.length) {
        this.logStrings(missingStrings, 'strings without translation')
        console.log()
      }
      if (!unusedStrings.length && !missingStrings.length) {
        console.log('✓ No issues found!\n')
      }
      this.underline(`Summary:\n  - ${unusedStrings.length} unused language strings found\n  - ${missingStrings.length} missing language strings found`)
    }
    console.log()
  }

  underline (s = '', topLine = true) {
    const line = ''.padEnd(80, '-')
    console.log(`${topLine ? line + '\n' : ''}  ${s}\n${line}`)
  }

  async getTranslatedStrings (root) {
    const langPacks = await glob(`${root}/adapt-authoring-*/lang`)
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

  async getUsedStrings (root, translatedStrings) {
    const usedStrings = {}
    const errorFiles = await glob('adapt-authoring-*/errors/*.json', { cwd: root, absolute: true })
    await Promise.all(errorFiles.map(async f => {
      Object.keys(JSON.parse((await fs.readFile(f)))).forEach(e => {
        const key = `error.${e}`
        if (!usedStrings[key]) usedStrings[key] = new Set()
        usedStrings[key].add(f.replace(root, '').split('/')[1]) // only add module name for errors
      })
    }))
    const sourceFiles = await glob('adapt-authoring-*/**/*.@(js|hbs)', { cwd: root, absolute: true, ignore: ['**/node_modules/**', '**/*.spec.js', '**/tests/**'] })

    await Promise.all(sourceFiles.map(async f => {
      const contents = (await fs.readFile(f)).toString()
      const allMatches = contents.matchAll(/(['"`])((?:app|error)\.[\w.]+)\1/g)

      for (const m of allMatches) {
        const key = m[2]
        if (Object.hasOwn(translatedStrings, key)) {
          translatedStrings[key] = true
        }
        if (!usedStrings[key]) usedStrings[key] = new Set()
        usedStrings[key].add(f.replace(root, ''))
      }
    }))
    Object.entries(usedStrings).forEach(([k, set]) => {
      usedStrings[k] = `${Array.from(set).map(s => `\n    ${s}`).join('')}`
    })
    return usedStrings
  }

  logStrings (strings, message) {
    if (!strings.length) {
      return console.log(`✓ No ${message}`)
    }
    this.underline(`Found ${strings.length} ${message}`)
    console.log(`${strings.map(s => `\n- ${s}`).join('')}`)
    process.exitCode = 1
  }
}
