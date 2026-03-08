import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { BUMP_ORDER, extractVersions, normalizeBump } from '../lib/versionCompare.js'

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
})
