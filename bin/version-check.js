import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import semver from 'semver'
import SimpleCliCommand from '../lib/SimpleCliCommand.js'
import { PREFIX } from '../lib/peerDeps.js'

const BUMP_ORDER = ['major', 'minor', 'patch']
const MAX_BUFFER = 20 * 1024 * 1024

export default class VersionCheck extends SimpleCliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Compares dependency versions between the last git tag and now, and recommends a semver bump',
      params: {},
      options: [
        ['--cwd <path>', 'Path to the git repository', process.cwd()],
        ['--json', 'Output results as JSON']
      ],
      getReleaseData: false
    }
  }

  async runTask () {
    const cwd = this.options.cwd || process.cwd()

    let tag
    try {
      tag = execSync('git describe --tags --abbrev=0', { cwd, encoding: 'utf8' }).trim()
    } catch {
      console.error('No git tags found in repository.')
      process.exitCode = 1
      return
    }

    let currentVersion
    try {
      const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
      currentVersion = pkg.version
    } catch {
      console.error('Could not read package.json in target directory.')
      process.exitCode = 1
      return
    }

    if (!semver.valid(currentVersion)) {
      console.error(`Invalid current version: ${currentVersion}`)
      process.exitCode = 1
      return
    }

    let oldLockRaw
    try {
      oldLockRaw = execSync(`git show ${tag}:package-lock.json`, { cwd, encoding: 'utf8', maxBuffer: MAX_BUFFER })
    } catch {
      console.error(`Could not read package-lock.json at tag ${tag}.`)
      process.exitCode = 1
      return
    }

    let newLockRaw
    try {
      newLockRaw = readFileSync(join(cwd, 'package-lock.json'), 'utf8')
    } catch {
      console.error('Could not read current package-lock.json.')
      process.exitCode = 1
      return
    }

    const oldVersions = this.extractVersions(JSON.parse(oldLockRaw))
    const newVersions = this.extractVersions(JSON.parse(newLockRaw))

    const allNames = new Set([...Object.keys(oldVersions), ...Object.keys(newVersions)])
    const changes = []

    for (const name of [...allNames].sort()) {
      const oldVer = oldVersions[name]
      const newVer = newVersions[name]

      if (oldVer && newVer) {
        if (oldVer === newVer) continue
        const diff = semver.diff(oldVer, newVer)
        if (!diff) continue
        changes.push({ name, oldVer, newVer, bump: this.normalizeBump(diff) })
      } else if (newVer && !oldVer) {
        changes.push({ name, oldVer: null, newVer, bump: 'minor' })
      } else {
        changes.push({ name, oldVer, newVer: null, bump: 'major' })
      }
    }

    if (changes.length === 0) {
      if (this.options.json) {
        console.log(JSON.stringify({ tag, currentVersion, changes: [], highestBump: null, recommendedVersion: null }))
      } else {
        console.log(`Comparing against tag: ${tag}\n`)
        console.log('No dependency changes detected.')
      }
      return
    }

    let highestBump = 'patch'
    for (const c of changes) {
      if (BUMP_ORDER.indexOf(c.bump) < BUMP_ORDER.indexOf(highestBump)) {
        highestBump = c.bump
      }
    }

    const recommendedVersion = semver.inc(currentVersion, highestBump)

    if (this.options.json) {
      console.log(JSON.stringify({ tag, currentVersion, changes, highestBump, recommendedVersion }))
      return
    }

    console.log(`Comparing against tag: ${tag}\n`)
    console.log('Changed dependencies:\n')

    const nameWidth = Math.max(...changes.map(c => c.name.length))
    const oldWidth = Math.max(...changes.map(c => (c.oldVer || '(new)').length))
    const newWidth = Math.max(...changes.map(c => (c.newVer || '(removed)').length))

    for (const c of changes) {
      const old = (c.oldVer || '(new)').padStart(oldWidth)
      const nw = (c.newVer || '(removed)').padEnd(newWidth)
      console.log(`  ${c.name.padEnd(nameWidth)}  ${old}  -> ${nw}  ${c.bump}`)
    }

    console.log(`\nHighest bump: ${highestBump}`)
    console.log(`Current version: ${currentVersion}`)
    console.log(`Recommended version: ${recommendedVersion}`)
  }

  extractVersions (lock) {
    const versions = {}
    const packages = lock.packages || {}
    for (const [key, entry] of Object.entries(packages)) {
      if (!key.startsWith('node_modules/')) continue
      const name = key.slice('node_modules/'.length)
      if (name.includes('/node_modules/')) continue
      if (!name.startsWith(PREFIX)) continue
      if (!entry.version || !semver.valid(entry.version)) continue
      versions[name] = entry.version
    }
    return versions
  }

  normalizeBump (diff) {
    if (diff.startsWith('pre')) return diff.slice(3)
    return diff
  }
}
