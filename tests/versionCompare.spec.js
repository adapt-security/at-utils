import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { BUMP_ORDER, diffVersions, extractVersions, normalizeBump } from '../lib/utils/versionCompare.js'

describe('versionCompare', () => {
  describe('BUMP_ORDER', () => {
    it('should be ["major", "minor", "patch"]', () => {
      assert.deepEqual(BUMP_ORDER, ['major', 'minor', 'patch'])
    })
  })

  describe('#extractVersions()', () => {
    it('should return empty object for empty lock', () => {
      assert.deepEqual(extractVersions({}), {})
    })

    it('should return empty object for empty packages', () => {
      assert.deepEqual(extractVersions({ packages: {} }), {})
    })

    it('should extract adapt-authoring-* package versions', () => {
      const lock = {
        packages: {
          'node_modules/adapt-authoring-core': { version: '1.0.0' },
          'node_modules/adapt-authoring-api': { version: '2.3.4' }
        }
      }
      assert.deepEqual(extractVersions(lock), {
        'adapt-authoring-core': '1.0.0',
        'adapt-authoring-api': '2.3.4'
      })
    })

    it('should skip non-adapt-authoring packages', () => {
      const lock = {
        packages: {
          'node_modules/lodash': { version: '4.17.21' },
          'node_modules/adapt-authoring-core': { version: '1.0.0' }
        }
      }
      const versions = extractVersions(lock)
      assert.ok(!Object.hasOwn(versions, 'lodash'))
      assert.ok(Object.hasOwn(versions, 'adapt-authoring-core'))
    })

    it('should skip nested node_modules entries', () => {
      const lock = {
        packages: {
          'node_modules/adapt-authoring-core/node_modules/semver': { version: '7.0.0' }
        }
      }
      assert.deepEqual(extractVersions(lock), {})
    })

    it('should skip entries without a version field', () => {
      const lock = {
        packages: {
          'node_modules/adapt-authoring-core': {}
        }
      }
      assert.deepEqual(extractVersions(lock), {})
    })

    it('should skip entries with invalid semver versions', () => {
      const lock = {
        packages: {
          'node_modules/adapt-authoring-core': { version: 'not-semver' }
        }
      }
      assert.deepEqual(extractVersions(lock), {})
    })

    it('should extract scoped adapt-authoring-* package versions', () => {
      const lock = {
        packages: {
          'node_modules/@acme/adapt-authoring-foo': { version: '0.5.0' },
          'node_modules/adapt-authoring-core': { version: '1.0.0' }
        }
      }
      assert.deepEqual(extractVersions(lock), {
        '@acme/adapt-authoring-foo': '0.5.0',
        'adapt-authoring-core': '1.0.0'
      })
    })

    it('should skip scoped packages that are not adapt-authoring', () => {
      const lock = {
        packages: {
          'node_modules/@babel/core': { version: '7.0.0' },
          'node_modules/@acme/adapt-authoring-foo': { version: '0.5.0' }
        }
      }
      const versions = extractVersions(lock)
      assert.ok(!Object.hasOwn(versions, '@babel/core'))
      assert.ok(Object.hasOwn(versions, '@acme/adapt-authoring-foo'))
    })
  })

  describe('#normalizeBump()', () => {
    it('should strip "pre" prefix from premajor', () => {
      assert.equal(normalizeBump('premajor'), 'major')
    })

    it('should strip "pre" prefix from preminor', () => {
      assert.equal(normalizeBump('preminor'), 'minor')
    })

    it('should strip "pre" prefix from prepatch', () => {
      assert.equal(normalizeBump('prepatch'), 'patch')
    })

    it('should return "major" unchanged', () => {
      assert.equal(normalizeBump('major'), 'major')
    })

    it('should return "minor" unchanged', () => {
      assert.equal(normalizeBump('minor'), 'minor')
    })

    it('should return "patch" unchanged', () => {
      assert.equal(normalizeBump('patch'), 'patch')
    })
  })

  describe('#diffVersions()', () => {
    it('should return empty array when both inputs are empty', () => {
      assert.deepEqual(diffVersions({}, {}), [])
    })

    it('should return empty array when versions are identical', () => {
      const versions = { 'adapt-authoring-core': '1.0.0', 'adapt-authoring-api': '2.0.0' }
      assert.deepEqual(diffVersions(versions, versions), [])
    })

    const bumpCases = [
      { name: 'patch bump', old: '1.0.0', new: '1.0.1', bump: 'patch' },
      { name: 'minor bump', old: '1.0.0', new: '1.1.0', bump: 'minor' },
      { name: 'major bump', old: '1.0.0', new: '2.0.0', bump: 'major' },
      { name: 'premajor normalised to major', old: '1.0.0', new: '2.0.0-rc.1', bump: 'major' },
      { name: 'preminor normalised to minor', old: '1.0.0', new: '1.1.0-rc.1', bump: 'minor' },
      { name: 'prepatch normalised to patch', old: '1.0.0', new: '1.0.1-rc.1', bump: 'patch' }
    ]
    for (const c of bumpCases) {
      it(`should detect ${c.name}`, () => {
        const changes = diffVersions(
          { 'adapt-authoring-core': c.old },
          { 'adapt-authoring-core': c.new }
        )
        assert.deepEqual(changes, [
          { name: 'adapt-authoring-core', oldVer: c.old, newVer: c.new, bump: c.bump }
        ])
      })
    }

    it('should mark added dependencies with oldVer: null and bump: "minor"', () => {
      const changes = diffVersions({}, { 'adapt-authoring-new': '1.0.0' })
      assert.deepEqual(changes, [
        { name: 'adapt-authoring-new', oldVer: null, newVer: '1.0.0', bump: 'minor' }
      ])
    })

    it('should mark removed dependencies with newVer: null and bump: "major"', () => {
      const changes = diffVersions({ 'adapt-authoring-old': '1.2.3' }, {})
      assert.deepEqual(changes, [
        { name: 'adapt-authoring-old', oldVer: '1.2.3', newVer: null, bump: 'major' }
      ])
    })

    it('should handle a mix of added, removed, and changed dependencies', () => {
      const oldVersions = {
        'adapt-authoring-core': '1.0.0',
        'adapt-authoring-removed': '1.0.0',
        'adapt-authoring-unchanged': '1.0.0'
      }
      const newVersions = {
        'adapt-authoring-core': '1.1.0',
        'adapt-authoring-added': '1.0.0',
        'adapt-authoring-unchanged': '1.0.0'
      }
      assert.deepEqual(diffVersions(oldVersions, newVersions), [
        { name: 'adapt-authoring-added', oldVer: null, newVer: '1.0.0', bump: 'minor' },
        { name: 'adapt-authoring-core', oldVer: '1.0.0', newVer: '1.1.0', bump: 'minor' },
        { name: 'adapt-authoring-removed', oldVer: '1.0.0', newVer: null, bump: 'major' }
      ])
    })

    it('should sort changes alphabetically by name', () => {
      const changes = diffVersions(
        { 'adapt-authoring-z': '1.0.0', 'adapt-authoring-a': '1.0.0' },
        { 'adapt-authoring-z': '2.0.0', 'adapt-authoring-a': '2.0.0' }
      )
      assert.deepEqual(changes.map(c => c.name), ['adapt-authoring-a', 'adapt-authoring-z'])
    })
  })
})
