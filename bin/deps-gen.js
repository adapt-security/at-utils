import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import buildPackageIndex from '../lib/utils/buildPackageIndex.js'
import CliCommand from '../lib/CliCommand.js'
import exec from '../lib/utils/exec.js'
import getModuleDirs from '../lib/utils/getModuleDirs.js'
import isModule from '../lib/utils/isModule.js'
import { isAdaptModule, deriveExpectedPeerDeps, deriveExpectedDeps, findOutdatedVersions } from '../lib/utils/peerDeps.js'

const CORE_PKG = 'adapt-authoring-core'

export default class DepsGen extends CliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Generates correct dependencies and peerDependencies from source code analysis',
      params: {},
      options: [
        ['--recursive', 'Process all AAT modules in child directories'],
        ['--write', 'Write changes to package.json files'],
        ['--versions-only', 'Only update dependency versions (skip code analysis)']
      ],
      getReleaseData: false
    }
  }

  async runTask () {
    const cwd = process.cwd()
    let moduleDirs

    if (this.options.recursive) {
      moduleDirs = getModuleDirs(cwd)
      if (moduleDirs.length === 0) {
        console.log('No modules found in child directories.')
        process.exitCode = 1
        return
      }
    } else {
      if (!this.options.versionsOnly && !isModule(cwd)) {
        console.error(`Not a valid module directory (no adapt-authoring.json found in ${cwd})`)
        process.exitCode = 1
        return
      }
      moduleDirs = [cwd]
    }

    const pkgIndex = buildPackageIndex(join(cwd, this.options.recursive ? '.' : '..'))
    const updatedDirs = []
    let count = 0

    for (const moduleDir of moduleDirs) {
      const result = this.processModule(moduleDir, pkgIndex)
      if (result) {
        count++
        if (this.options.write) {
          updatedDirs.push(moduleDir)
        }
      }
    }

    if (count === 0) {
      console.log('No modules with adapt-authoring dependencies found.')
    } else if (!this.options.write) {
      console.log(`\n${count} module(s) found. Run with --write to update package.json files.`)
    }

    if (updatedDirs.length > 0) {
      for (const dir of updatedDirs) {
        console.log(`  Running npm update in ${dir}...`)
        try {
          await exec('npm update', dir)
          console.log('  ✓ npm update complete')
        } catch (e) {
          console.error(`  ✗ npm update failed: ${e.message}`)
        }
      }
    }
  }

  processModule (moduleDir, pkgIndex) {
    if (this.options.versionsOnly) {
      return this.processVersionsOnly(moduleDir, pkgIndex)
    }

    let peerResult = deriveExpectedPeerDeps(moduleDir, pkgIndex)
    const depsResult = deriveExpectedDeps(moduleDir, pkgIndex)

    // Ensure adapt-authoring-core is a peerDependency for all modules
    // that don't have it as a direct dependency
    if (!peerResult) {
      const modPkgPath = join(moduleDir, 'package.json')
      if (existsSync(modPkgPath)) {
        const modPkg = JSON.parse(readFileSync(modPkgPath, 'utf8'))
        const directDeps = modPkg.dependencies || {}
        if (modPkg.name !== CORE_PKG && !Object.hasOwn(directDeps, CORE_PKG)) {
          peerResult = { moduleName: modPkg.name, pkgPath: modPkgPath, pkg: modPkg, peerDeps: {}, warnings: [] }
        }
      }
    }
    if (peerResult && peerResult.moduleName !== CORE_PKG) {
      const directDeps = peerResult.pkg.dependencies || {}
      if (!Object.hasOwn(directDeps, CORE_PKG) && !peerResult.peerDeps[CORE_PKG]) {
        const coreInfo = pkgIndex.get(CORE_PKG)
        peerResult.peerDeps[CORE_PKG] = coreInfo ? `^${coreInfo.version}` : '*'
        const sorted = {}
        for (const key of Object.keys(peerResult.peerDeps).sort()) {
          sorted[key] = peerResult.peerDeps[key]
        }
        peerResult.peerDeps = sorted
      }
    }

    if (!peerResult && !depsResult) {
      if (!this.options.recursive) console.log(`No adapt-authoring dependencies found in ${moduleDir}`)
      return false
    }

    const pkg = peerResult?.pkg || depsResult.pkg
    const pkgPath = peerResult?.pkgPath || depsResult.pkgPath
    const moduleName = peerResult?.moduleName || depsResult.moduleName
    const peerDeps = peerResult?.peerDeps || {}
    const expectedDeps = depsResult?.expectedDeps || {}
    const warnings = [...(peerResult?.warnings || []), ...(depsResult?.warnings || [])]

    console.log(`\n${moduleName}:`)

    if (Object.keys(expectedDeps).length > 0) {
      console.log('  dependencies:')
      for (const [dep, ver] of Object.entries(expectedDeps)) {
        console.log(`    ${dep}: ${ver}`)
      }
    }

    if (Object.keys(peerDeps).length > 0) {
      console.log('  peerDependencies:')
      for (const [dep, ver] of Object.entries(peerDeps)) {
        console.log(`    ${dep}: ${ver}`)
      }
    }

    for (const w of warnings) {
      console.log(`  ⚠ ${w}`)
    }

    if (this.options.write) {
      this.writePackageJson(pkg, pkgPath, expectedDeps, peerDeps)
    }

    return true
  }

  processVersionsOnly (moduleDir, pkgIndex) {
    const pkgPath = join(moduleDir, 'package.json')
    if (!existsSync(pkgPath)) return false

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const moduleName = pkg.name
    const updates = findOutdatedVersions(pkg, pkgIndex)

    if (updates.length === 0) return false

    console.log(`\n${moduleName}:`)
    for (const { dep, current, expected, section } of updates) {
      console.log(`  ${dep} (${section}): ${current} → ${expected}`)
    }

    if (this.options.write) {
      for (const { dep, expected, section } of updates) {
        pkg[section][dep] = expected
      }
      if (pkg.peerDependenciesMeta) {
        for (const { dep, section } of updates) {
          if (section === 'peerDependencies') {
            pkg.peerDependenciesMeta[dep] = { optional: true }
          }
        }
      }
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
      console.log(`  ✓ written to ${pkgPath}`)
    }

    return true
  }

  writePackageJson (pkg, pkgPath, expectedDeps, peerDeps) {
    // Update adapt-authoring-* dependencies: preserve non-adapt deps, add expected ones
    const currentDeps = pkg.dependencies || {}
    const currentPeerDeps = pkg.peerDependencies || {}
    const updatedDeps = {}
    for (const [dep, ver] of Object.entries(currentDeps)) {
      if (!isAdaptModule(dep)) {
        updatedDeps[dep] = ver
      }
    }
    // Add/keep expected adapt-authoring dependencies, preserving existing versions
    for (const [dep, ver] of Object.entries(expectedDeps)) {
      updatedDeps[dep] = currentDeps[dep] || ver
    }
    const sortedDeps = {}
    for (const key of Object.keys(updatedDeps).sort()) {
      sortedDeps[key] = updatedDeps[key]
    }
    pkg.dependencies = sortedDeps

    // Update peerDependencies: add missing, preserve existing versions
    const updatedPeerDeps = {}
    for (const [dep, ver] of Object.entries(peerDeps)) {
      updatedPeerDeps[dep] = currentPeerDeps[dep] || ver
    }
    pkg.peerDependencies = updatedPeerDeps

    const peerDepsMeta = {}
    for (const dep of Object.keys(peerDeps)) {
      peerDepsMeta[dep] = { optional: true }
    }
    pkg.peerDependenciesMeta = peerDepsMeta

    // Rebuild the package object with correct key ordering:
    // peerDependencies and peerDependenciesMeta directly after dependencies
    const ordered = {}
    for (const key of Object.keys(pkg)) {
      if (key === 'peerDependencies' || key === 'peerDependenciesMeta') continue
      ordered[key] = pkg[key]
      if (key === 'dependencies') {
        ordered.peerDependencies = pkg.peerDependencies
        ordered.peerDependenciesMeta = pkg.peerDependenciesMeta
      }
    }
    // If there was no dependencies key, ensure they're added before devDependencies
    if (!ordered.peerDependencies) {
      const final = {}
      for (const key of Object.keys(ordered)) {
        if (key === 'devDependencies') {
          final.peerDependencies = pkg.peerDependencies
          final.peerDependenciesMeta = pkg.peerDependenciesMeta
        }
        final[key] = ordered[key]
      }
      if (!final.peerDependencies) {
        final.peerDependencies = pkg.peerDependencies
        final.peerDependenciesMeta = pkg.peerDependenciesMeta
      }
      writeFileSync(pkgPath, JSON.stringify(final, null, 2) + '\n')
    } else {
      writeFileSync(pkgPath, JSON.stringify(ordered, null, 2) + '\n')
    }
    console.log(`  ✓ written to ${pkgPath}`)
  }
}
