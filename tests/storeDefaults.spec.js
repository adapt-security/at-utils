import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import storeDefaults from '../lib/utils/storeDefaults.js'

describe('storeDefaults', () => {
  it('sets required properties to null', () => {
    const schema = {
      required: ['host'],
      properties: {
        host: { type: 'string' }
      }
    }
    const result = storeDefaults(schema)
    assert.equal(result.host, null)
  })

  it('ignores optional properties without defaults by default', () => {
    const schema = {
      properties: {
        port: { type: 'number' }
      }
    }
    const result = storeDefaults(schema)
    assert.equal(Object.hasOwn(result, 'port'), false)
  })

  it('includes default values when useDefaults is true', () => {
    const schema = {
      properties: {
        port: { type: 'number', default: 8080 }
      }
    }
    const result = storeDefaults(schema, {}, { useDefaults: true })
    assert.equal(result.port, 8080)
  })

  it('does not include default values when useDefaults is false', () => {
    const schema = {
      properties: {
        port: { type: 'number', default: 8080 }
      }
    }
    const result = storeDefaults(schema)
    assert.equal(Object.hasOwn(result, 'port'), false)
  })

  it('does not overwrite existing values by default', () => {
    const schema = {
      required: ['host'],
      properties: {
        host: { type: 'string' }
      }
    }
    const result = storeDefaults(schema, { host: 'localhost' })
    assert.equal(result.host, 'localhost')
  })

  it('overwrites existing values when replace is true', () => {
    const schema = {
      required: ['host'],
      properties: {
        host: { type: 'string' }
      }
    }
    const result = storeDefaults(schema, { host: 'localhost' }, { replace: true })
    assert.equal(result.host, null)
  })

  it('recurses into nested object properties', () => {
    const schema = {
      properties: {
        db: {
          type: 'object',
          properties: {
            connectionUri: { type: 'string', default: 'mongodb://localhost' }
          }
        }
      }
    }
    const result = storeDefaults(schema, {}, { useDefaults: true })
    assert.equal(result.db.connectionUri, 'mongodb://localhost')
  })

  it('required takes precedence over default', () => {
    const schema = {
      required: ['secret'],
      properties: {
        secret: { type: 'string', default: 'changeme' }
      }
    }
    const result = storeDefaults(schema, {}, { useDefaults: true })
    assert.equal(result.secret, null)
  })

  it('handles schema with no required array', () => {
    const schema = {
      properties: {
        port: { type: 'number', default: 3000 }
      }
    }
    const result = storeDefaults(schema, {}, { useDefaults: true })
    assert.equal(result.port, 3000)
  })

  it('returns the defaults object passed in', () => {
    const schema = {
      required: ['host'],
      properties: {
        host: { type: 'string' }
      }
    }
    const defaults = { existing: 'value' }
    const result = storeDefaults(schema, defaults)
    assert.equal(result, defaults)
    assert.equal(result.existing, 'value')
    assert.equal(result.host, null)
  })
})
