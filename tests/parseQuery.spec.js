import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parseQuery from '../lib/utils/parseQuery.js'

describe('parseQuery', () => {
  describe('#parseQuery()', () => {
    it('should return empty object when no query string', () => {
      const req = { url: '/path' }
      assert.deepEqual(parseQuery(req), {})
    })

    it('should parse a single query param', () => {
      const req = { url: '/path?key=value' }
      assert.deepEqual(parseQuery(req), { key: 'value' })
    })

    it('should parse multiple query params', () => {
      const req = { url: '/path?a=1&b=2' }
      assert.deepEqual(parseQuery(req), { a: '1', b: '2' })
    })

    it('should strip query string from req.url', () => {
      const req = { url: '/path?key=value' }
      parseQuery(req)
      assert.equal(req.url, '/path')
    })

    it('should not modify req.url when there is no query string', () => {
      const req = { url: '/path' }
      parseQuery(req)
      assert.equal(req.url, '/path')
    })

    it('should handle query param without value', () => {
      const req = { url: '/path?flag' }
      assert.deepEqual(parseQuery(req), { flag: '' })
    })

    it('should handle query param with empty value', () => {
      const req = { url: '/path?key=' }
      assert.deepEqual(parseQuery(req), { key: '' })
    })

    it('should handle empty query string', () => {
      const req = { url: '/path?' }
      const result = parseQuery(req)
      assert.ok(typeof result === 'object')
    })
  })
})
