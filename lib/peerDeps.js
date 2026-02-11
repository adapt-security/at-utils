import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import collectJsFiles from './utils/collectJsFiles.js'

export const PREFIX = 'adapt-authoring-'

/**
 * Extract all waitForModule module names from a list of JS files
 */
export function extractModuleNames (files) {
  const names = new Set()
  const callRegex = /waitForModule\(([^)]+)\)/g
  const argRegex = /'([^']+)'/g

  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    for (const callMatch of src.matchAll(callRegex)) {
      const argsStr = callMatch[1]
      for (const argMatch of argsStr.matchAll(argRegex)) {
        names.add(argMatch[1])
      }
    }
  }
  return names
}

/**
 * Extract all imported adapt-authoring-* module names from a list of JS files.
 * Matches ES import and CommonJS require statements.
 */
export function extractImportedModules (files) {
  const names = new Set()
  const importRegex = /(?:from|require\()\s*['"]((adapt-authoring-[^/'"]+)(?:\/[^'"]*)?)['"]/g

  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    for (const match of src.matchAll(importRegex)) {
      names.add(match[2])
    }
  }
  return names
}

/**
 * Apply the adapt-authoring- prefix if missing
 */
export function toFullName (shortName) {
  return shortName.startsWith(PREFIX) ? shortName : PREFIX + shortName
}

/**
 * Derive the expected peerDependencies for a module directory.
 * Returns null if the module has no lib/ dir or no waitForModule calls.
 * Returns { moduleName, pkgPath, pkg, peerDeps, warnings } on success.
 */
export function deriveExpectedPeerDeps (moduleDir, pkgIndex) {
  const pkgPath = join(moduleDir, 'package.json')
  if (!existsSync(pkgPath)) return null

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const moduleName = pkg.name
  const libDir = join(moduleDir, 'lib')

  if (!existsSync(libDir) || !statSync(libDir).isDirectory()) {
    return null
  }

  const jsFiles = collectJsFiles(libDir)
  if (jsFiles.length === 0) return null

  const rawNames = extractModuleNames(jsFiles)
  if (rawNames.size === 0) return null

  const directDeps = pkg.dependencies || {}
  const peerDeps = {}
  const warnings = []

  for (const name of [...rawNames].sort()) {
    const fullName = toFullName(name)
    if (fullName === moduleName) continue
    if (Object.hasOwn(directDeps, fullName)) continue

    const info = pkgIndex.get(fullName)
    if (info) {
      peerDeps[fullName] = `^${info.version}`
    } else {
      peerDeps[fullName] = '*'
      warnings.push(`${fullName}: package not found locally, using "*"`)
    }
  }

  if (Object.keys(peerDeps).length === 0) return null

  return { moduleName, pkgPath, pkg, peerDeps, warnings }
}

/**
 * Derive the expected adapt-authoring-* dependencies for a module directory
 * based on import/require statements in lib/.
 * Returns null if the module has no lib/ dir or no adapt-authoring imports.
 * Returns { moduleName, pkgPath, pkg, expectedDeps, warnings } on success.
 */
export function deriveExpectedDeps (moduleDir, pkgIndex) {
  const pkgPath = join(moduleDir, 'package.json')
  if (!existsSync(pkgPath)) return null

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const moduleName = pkg.name
  const libDir = join(moduleDir, 'lib')

  if (!existsSync(libDir) || !statSync(libDir).isDirectory()) {
    return null
  }

  const jsFiles = collectJsFiles(libDir)
  if (jsFiles.length === 0) return null

  const importedNames = extractImportedModules(jsFiles)
  if (importedNames.size === 0) return null

  const expectedDeps = {}
  const warnings = []

  for (const fullName of [...importedNames].sort()) {
    if (fullName === moduleName) continue

    const info = pkgIndex.get(fullName)
    if (info) {
      expectedDeps[fullName] = `^${info.version}`
    } else {
      warnings.push(`${fullName}: package not found locally`)
    }
  }

  if (Object.keys(expectedDeps).length === 0) return null

  return { moduleName, pkgPath, pkg, expectedDeps, warnings }
}
