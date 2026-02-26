import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import semver from 'semver'
import { PREFIX } from './peerDeps.js'

export const BUMP_ORDER = ['major', 'minor', 'patch']
const MAX_BUFFER = 20 * 1024 * 1024

export function extractVersions (lock) {
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

export function normalizeBump (diff) {
  if (diff.startsWith('pre')) return diff.slice(3)
  return diff
}

/**
 * Compare dependency versions between the last git tag and the current lockfile.
 * Returns { tag, currentVersion, changes, highestBump, recommendedVersion }.
 * Throws on any error (no tags, missing files, invalid version).
 * Returns changes: [] when no differences found.
 */
export function compareVersions (cwd) {
  let tag
  try {
    tag = execSync('git describe --tags --abbrev=0', { cwd, encoding: 'utf8' }).trim()
  } catch {
    throw new Error('No git tags found in repository.')
  }

  let currentVersion
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
    currentVersion = pkg.version
  } catch {
    throw new Error('Could not read package.json in target directory.')
  }

  if (!semver.valid(currentVersion)) {
    throw new Error(`Invalid current version: ${currentVersion}`)
  }

  let oldLockRaw
  try {
    oldLockRaw = execSync(`git show ${tag}:package-lock.json`, { cwd, encoding: 'utf8', maxBuffer: MAX_BUFFER })
  } catch {
    throw new Error(`Could not read package-lock.json at tag ${tag}.`)
  }

  let newLockRaw
  try {
    newLockRaw = readFileSync(join(cwd, 'package-lock.json'), 'utf8')
  } catch {
    throw new Error('Could not read current package-lock.json.')
  }

  const oldVersions = extractVersions(JSON.parse(oldLockRaw))
  const newVersions = extractVersions(JSON.parse(newLockRaw))

  const allNames = new Set([...Object.keys(oldVersions), ...Object.keys(newVersions)])
  const changes = []

  for (const name of [...allNames].sort()) {
    const oldVer = oldVersions[name]
    const newVer = newVersions[name]

    if (oldVer && newVer) {
      if (oldVer === newVer) continue
      const diff = semver.diff(oldVer, newVer)
      if (!diff) continue
      changes.push({ name, oldVer, newVer, bump: normalizeBump(diff) })
    } else if (newVer && !oldVer) {
      changes.push({ name, oldVer: null, newVer, bump: 'minor' })
    } else {
      changes.push({ name, oldVer, newVer: null, bump: 'major' })
    }
  }

  if (changes.length === 0) {
    return { tag, currentVersion, changes: [], highestBump: null, recommendedVersion: null }
  }

  let highestBump = 'patch'
  for (const c of changes) {
    if (BUMP_ORDER.indexOf(c.bump) < BUMP_ORDER.indexOf(highestBump)) {
      highestBump = c.bump
    }
  }

  const recommendedVersion = semver.inc(currentVersion, highestBump)

  return { tag, currentVersion, changes, highestBump, recommendedVersion }
}
