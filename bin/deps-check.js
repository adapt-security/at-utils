import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import SimpleCliCommand from '../lib/SimpleCliCommand.js'
import Utils from '../lib/Utils.js'
import { PREFIX, deriveExpectedPeerDeps, deriveExpectedDeps } from '../lib/peerDeps.js'

const CORE_PKG = 'adapt-authoring-core'

export default class DepsCheck extends SimpleCliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Checks dependencies and peerDependencies against source code analysis',
      params: {},
      options: [['--recursive', 'Check all AAT modules in child directories']],
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
    let totalErrors = 0

    for (const moduleDir of moduleDirs) {
      const errors = this.checkModule(moduleDir, pkgIndex)
      totalErrors += errors
    }

    if (totalErrors > 0) {
      process.exitCode = 1
    }
  }

  checkModule (moduleDir, pkgIndex) {
    const pkgPath = join(moduleDir, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const moduleName = pkg.name
    const declaredPeerDeps = new Set(Object.keys(pkg.peerDependencies || {}))
    const declaredDeps = new Set(Object.keys(pkg.dependencies || {}).filter(n => n.startsWith(PREFIX)))

    console.log(`Checking ${moduleName}...`)

    let peerResult = deriveExpectedPeerDeps(moduleDir, pkgIndex)

    const directDeps = pkg.dependencies || {}
    const isCorePkg = moduleName === CORE_PKG
    const hasCoreAsDirect = Object.hasOwn(directDeps, CORE_PKG)

    if (!isCorePkg && !hasCoreAsDirect) {
      if (!peerResult) {
        peerResult = { peerDeps: {} }
      }
      if (!peerResult.peerDeps[CORE_PKG]) {
        const coreInfo = pkgIndex.get(CORE_PKG)
        peerResult.peerDeps[CORE_PKG] = coreInfo ? `^${coreInfo.version}` : '*'
      }
    }

    const expectedPeerNames = peerResult ? new Set(Object.keys(peerResult.peerDeps)) : new Set()
    const missingPeer = [...expectedPeerNames].filter(n => !declaredPeerDeps.has(n)).sort()
    const extraPeer = [...declaredPeerDeps].filter(n => !expectedPeerNames.has(n)).sort()

    const depsResult = deriveExpectedDeps(moduleDir, pkgIndex)
    const expectedDepNames = depsResult ? new Set(Object.keys(depsResult.expectedDeps)) : new Set()
    const missingDeps = [...expectedDepNames].filter(n => !declaredDeps.has(n)).sort()
    const extraDeps = [...declaredDeps].filter(n => !expectedDepNames.has(n)).sort()

    const errors = missingPeer.length + extraPeer.length + missingDeps.length + extraDeps.length

    if (errors === 0) {
      console.log(`Checking ${moduleName}... ✓`)
      return 0
    }

    console.log()

    if (missingDeps.length > 0) {
      console.log('✗ Missing dependencies (imported in code but not in dependencies):')
      for (const name of missingDeps) {
        console.log(`  - ${name}`)
      }
      console.log()
    }

    if (extraDeps.length > 0) {
      console.log('✗ Extra dependencies (in dependencies but not imported in code):')
      for (const name of extraDeps) {
        console.log(`  - ${name}`)
      }
      console.log()
    }

    if (missingPeer.length > 0) {
      console.log('✗ Missing peerDependencies:')
      for (const name of missingPeer) {
        console.log(`  - ${name}`)
      }
      console.log()
    }

    if (extraPeer.length > 0) {
      console.log('✗ Extra peerDependencies (not used in code):')
      for (const name of extraPeer) {
        console.log(`  - ${name}`)
      }
      console.log()
    }

    console.log(`Found ${errors} error(s).`)
    return errors
  }
}
