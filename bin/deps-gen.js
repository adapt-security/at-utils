import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import SimpleCliCommand from '../lib/SimpleCliCommand.js'
import Utils from '../lib/Utils.js'
import { PREFIX, deriveExpectedPeerDeps, deriveExpectedDeps } from '../lib/peerDeps.js'

const CORE_PKG = 'adapt-authoring-core'

export default class DepsGen extends SimpleCliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Generates correct dependencies and peerDependencies from source code analysis',
      params: {},
      options: [
        ['--recursive', 'Process all AAT modules in child directories'],
        ['--write', 'Write changes to package.json files']
      ],
      getReleaseData: false
    }
  }

  async runTask () {
    const cwd = process.cwd()
    let moduleDirs

    if (this.options.recursive) {
      moduleDirs = Utils.getModuleDirs(cwd)
      if (moduleDirs.length === 0) {
        console.log('No modules found in child directories.')
        process.exitCode = 1
        return
      }
    } else {
      if (!Utils.isModule(cwd)) {
        console.error(`Not a valid module directory (no adapt-authoring.json found in ${cwd})`)
        process.exitCode = 1
        return
      }
      moduleDirs = [cwd]
    }

    const pkgIndex = Utils.buildPackageIndex(join(cwd, this.options.recursive ? '.' : '..'))
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
          await Utils.exec('npm update', dir)
          console.log('  ✓ npm update complete')
        } catch (e) {
          console.error(`  ✗ npm update failed: ${e.message}`)
        }
      }
    }
  }

  processModule (moduleDir, pkgIndex) {
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

  writePackageJson (pkg, pkgPath, expectedDeps, peerDeps) {
    // Update adapt-authoring-* dependencies: preserve non-adapt deps, add expected ones
    const currentDeps = pkg.dependencies || {}
    const updatedDeps = {}
    for (const [dep, ver] of Object.entries(currentDeps)) {
      if (!dep.startsWith(PREFIX)) {
        updatedDeps[dep] = ver
      }
    }
    for (const [dep, ver] of Object.entries(expectedDeps)) {
      updatedDeps[dep] = ver
    }
    const sortedDeps = {}
    for (const key of Object.keys(updatedDeps).sort()) {
      sortedDeps[key] = updatedDeps[key]
    }
    pkg.dependencies = sortedDeps

    pkg.peerDependencies = peerDeps

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
