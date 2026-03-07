import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import buildPackageIndex from '../lib/utils/buildPackageIndex.js'

describe('buildPackageIndex', () => {
  let tmpDir

  before(() => {
    tmpDir = join(tmpdir(), `buildPkgIndex-${Date.now()}`)
    mkdirSync(join(tmpDir, 'module-a'), { recursive: true })
    writeFileSync(
      join(tmpDir, 'module-a', 'package.json'),
      JSON.stringify({ name: 'adapt-authoring-a', version: '1.2.3' })
    )
    mkdirSync(join(tmpDir, 'module-b'), { recursive: true })
    writeFileSync(
      join(tmpDir, 'module-b', 'package.json'),
      JSON.stringify({ name: 'adapt-authoring-b', version: '0.1.0' })
    )
    mkdirSync(join(tmpDir, 'no-pkg'), { recursive: true })
    writeFileSync(join(tmpDir, 'loose-file.json'), '{}')
  })

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('#buildPackageIndex()', () => {
    it('should return a Map', () => {
      assert.ok(buildPackageIndex(tmpDir) instanceof Map)
    })

    it('should index packages by name with version and dir', () => {
      const result = buildPackageIndex(tmpDir)
      assert.ok(result.has('adapt-authoring-a'))
      assert.equal(result.get('adapt-authoring-a').version, '1.2.3')
      assert.equal(result.get('adapt-authoring-a').dir, 'module-a')
    })

    it('should index all packages in the directory', () => {
      const result = buildPackageIndex(tmpDir)
      assert.ok(result.has('adapt-authoring-b'))
      assert.equal(result.get('adapt-authoring-b').version, '0.1.0')
    })

    it('should skip directories without package.json', () => {
      const result = buildPackageIndex(tmpDir)
      assert.ok(!result.has('no-pkg'))
    })

    it('should return empty Map for an empty directory', () => {
      const emptyDir = join(tmpdir(), `buildPkgIndex-empty-${Date.now()}`)
      mkdirSync(emptyDir, { recursive: true })
      try {
        assert.equal(buildPackageIndex(emptyDir).size, 0)
      } finally {
        rmSync(emptyDir, { recursive: true, force: true })
      }
    })
  })
})
