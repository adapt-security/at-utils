import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import checkSchemaForDuplicates from '../lib/utils/checkSchemaForDuplicates.js'

describe('checkSchemaForDuplicates', () => {
  it('tracks properties with their schema anchor', () => {
    const usedKeys = {}
    checkSchemaForDuplicates({
      $anchor: 'base',
      properties: { title: {}, body: {} }
    }, usedKeys)
    assert.deepEqual(usedKeys.title, ['base'])
    assert.deepEqual(usedKeys.body, ['base'])
  })

  it('appends to existing entries for duplicate properties', () => {
    const usedKeys = { title: ['base'] }
    checkSchemaForDuplicates({
      $anchor: 'extended',
      properties: { title: {}, description: {} }
    }, usedKeys)
    assert.deepEqual(usedKeys.title, ['base', 'extended'])
    assert.deepEqual(usedKeys.description, ['extended'])
  })

  it('skips _globals property', () => {
    const usedKeys = {}
    checkSchemaForDuplicates({
      $anchor: 'test',
      properties: { _globals: {}, title: {} }
    }, usedKeys)
    assert.equal(Object.hasOwn(usedKeys, '_globals'), false)
    assert.deepEqual(usedKeys.title, ['test'])
  })

  it('handles $patch format', () => {
    const usedKeys = {}
    checkSchemaForDuplicates({
      $anchor: 'patched',
      $patch: { with: { properties: { name: {} } } }
    }, usedKeys)
    assert.deepEqual(usedKeys.name, ['patched'])
  })

  it('handles $merge format', () => {
    const usedKeys = {}
    checkSchemaForDuplicates({
      $anchor: 'merged',
      $merge: { with: { properties: { name: {} } } }
    }, usedKeys)
    assert.deepEqual(usedKeys.name, ['merged'])
  })

  it('does nothing when schema has no properties', () => {
    const usedKeys = {}
    checkSchemaForDuplicates({ $anchor: 'empty' }, usedKeys)
    assert.deepEqual(usedKeys, {})
  })

  it('prefers direct properties over $patch/$merge', () => {
    const usedKeys = {}
    checkSchemaForDuplicates({
      $anchor: 'both',
      properties: { direct: {} },
      $patch: { with: { properties: { patched: {} } } }
    }, usedKeys)
    assert.deepEqual(usedKeys.direct, ['both'])
    assert.equal(Object.hasOwn(usedKeys, 'patched'), false)
  })
})
