import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  PREFIX,
  extractModuleNames,
  extractImportedModules,
  toFullName,
  findOutdatedVersions
} from '../lib/peerDeps.js'

describe('peerDeps', () => {
  describe('PREFIX', () => {
    it('should equal "adapt-authoring-"', () => {
      assert.equal(PREFIX, 'adapt-authoring-')
    })
  })

  describe('#toFullName()', () => {
    it('should add prefix when missing', () => {
      assert.equal(toFullName('core'), 'adapt-authoring-core')
    })

    it('should not double-add prefix', () => {
      assert.equal(toFullName('adapt-authoring-core'), 'adapt-authoring-core')
    })

    it('should handle empty string', () => {
      assert.equal(toFullName(''), 'adapt-authoring-')
    })
  })

  describe('#extractModuleNames()', () => {
    let tmpDir

    before(() => {
      tmpDir = join(tmpdir(), `peerDeps-names-${Date.now()}`)
      mkdirSync(tmpDir, { recursive: true })
    })

    after(() => {
      rmSync(tmpDir, { recursive: true, force: true })
    })

    it('should return empty set for empty file list', () => {
      const result = extractModuleNames([])
      assert.equal(result.size, 0)
    })

    it('should extract module names from waitForModule calls', () => {
      const file = join(tmpDir, 'test1.js')
      writeFileSync(file, "await app.waitForModule('core')\nawait app.waitForModule('adapt-authoring-api')")
      const result = extractModuleNames([file])
      assert.ok(result.has('core'))
      assert.ok(result.has('adapt-authoring-api'))
    })

    it('should extract multiple args from a single waitForModule call', () => {
      const file = join(tmpDir, 'test2.js')
      writeFileSync(file, "await app.waitForModule('core', 'server')")
      const result = extractModuleNames([file])
      assert.ok(result.has('core'))
      assert.ok(result.has('server'))
    })

    it('should return empty set for files with no waitForModule calls', () => {
      const file = join(tmpDir, 'test3.js')
      writeFileSync(file, "import something from 'somewhere'")
      const result = extractModuleNames([file])
      assert.equal(result.size, 0)
    })

    it('should deduplicate module names across files', () => {
      const file1 = join(tmpDir, 'dup1.js')
      const file2 = join(tmpDir, 'dup2.js')
      writeFileSync(file1, "await app.waitForModule('core')")
      writeFileSync(file2, "await app.waitForModule('core')")
      const result = extractModuleNames([file1, file2])
      assert.equal(result.size, 1)
    })
  })

  describe('#extractImportedModules()', () => {
    let tmpDir

    before(() => {
      tmpDir = join(tmpdir(), `peerDeps-imports-${Date.now()}`)
      mkdirSync(tmpDir, { recursive: true })
    })

    after(() => {
      rmSync(tmpDir, { recursive: true, force: true })
    })

    it('should return empty set for empty file list', () => {
      assert.equal(extractImportedModules([]).size, 0)
    })

    it('should extract adapt-authoring-* names from ES import statements', () => {
      const file = join(tmpDir, 'import1.js')
      writeFileSync(file, "import Foo from 'adapt-authoring-core'\nimport Bar from 'adapt-authoring-api/util'")
      const result = extractImportedModules([file])
      assert.ok(result.has('adapt-authoring-core'))
      assert.ok(result.has('adapt-authoring-api'))
    })

    it('should extract adapt-authoring-* names from require() calls', () => {
      const file = join(tmpDir, 'require1.js')
      writeFileSync(file, "const Foo = require('adapt-authoring-core')")
      const result = extractImportedModules([file])
      assert.ok(result.has('adapt-authoring-core'))
    })

    it('should ignore non-adapt-authoring imports', () => {
      const file = join(tmpDir, 'import2.js')
      writeFileSync(file, "import Foo from 'lodash'\nimport Bar from 'path'")
      const result = extractImportedModules([file])
      assert.equal(result.size, 0)
    })

    it('should deduplicate module names across files', () => {
      const file1 = join(tmpDir, 'dedup1.js')
      const file2 = join(tmpDir, 'dedup2.js')
      writeFileSync(file1, "import Foo from 'adapt-authoring-core'")
      writeFileSync(file2, "import Bar from 'adapt-authoring-core'")
      const result = extractImportedModules([file1, file2])
      assert.equal(result.size, 1)
    })
  })

  describe('#findOutdatedVersions()', () => {
    it('should return empty array when all versions are current', () => {
      const pkg = { dependencies: { 'adapt-authoring-core': '^1.0.0' } }
      const pkgIndex = new Map([['adapt-authoring-core', { version: '1.0.0' }]])
      assert.deepEqual(findOutdatedVersions(pkg, pkgIndex), [])
    })

    it('should detect outdated dependency versions', () => {
      const pkg = { dependencies: { 'adapt-authoring-core': '^0.9.0' } }
      const pkgIndex = new Map([['adapt-authoring-core', { version: '1.0.0' }]])
      const result = findOutdatedVersions(pkg, pkgIndex)
      assert.equal(result.length, 1)
      assert.equal(result[0].dep, 'adapt-authoring-core')
      assert.equal(result[0].current, '^0.9.0')
      assert.equal(result[0].expected, '^1.0.0')
      assert.equal(result[0].section, 'dependencies')
    })

    it('should detect outdated peerDependency versions', () => {
      const pkg = { peerDependencies: { 'adapt-authoring-core': '^0.9.0' } }
      const pkgIndex = new Map([['adapt-authoring-core', { version: '1.0.0' }]])
      const result = findOutdatedVersions(pkg, pkgIndex)
      assert.equal(result.length, 1)
      assert.equal(result[0].section, 'peerDependencies')
    })

    it('should skip packages not in pkgIndex', () => {
      const pkg = { dependencies: { 'adapt-authoring-core': '^1.0.0' } }
      assert.deepEqual(findOutdatedVersions(pkg, new Map()), [])
    })

    it('should skip non-adapt-authoring packages', () => {
      const pkg = { dependencies: { lodash: '^4.0.0' } }
      const pkgIndex = new Map([['lodash', { version: '4.17.21' }]])
      assert.deepEqual(findOutdatedVersions(pkg, pkgIndex), [])
    })

    it('should handle pkg with no dependencies or peerDependencies', () => {
      assert.deepEqual(findOutdatedVersions({}, new Map()), [])
    })
  })
})
