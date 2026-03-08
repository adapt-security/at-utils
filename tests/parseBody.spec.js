import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import parseBody from '../lib/utils/parseBody.js'

function makeRequest (method, body) {
  const req = new EventEmitter()
  req.method = method
  process.nextTick(() => {
    if (body !== undefined) {
      req.emit('data', JSON.stringify(body))
    }
    req.emit('end')
  })
  return req
}

describe('parseBody', () => {
  describe('#parseBody()', () => {
    it('should return empty object for GET requests', async () => {
      assert.deepEqual(await parseBody({ method: 'GET' }), {})
    })

    it('should return empty object for PUT requests', async () => {
      assert.deepEqual(await parseBody({ method: 'PUT' }), {})
    })

    it('should parse JSON body from POST request', async () => {
      const req = makeRequest('POST', { name: 'test', value: 42 })
      assert.deepEqual(await parseBody(req), { name: 'test', value: 42 })
    })

    it('should return empty object for POST with no body data', async () => {
      const req = makeRequest('POST')
      assert.deepEqual(await parseBody(req), {})
    })

    it('should reject on malformed JSON', async () => {
      const req = new EventEmitter()
      req.method = 'POST'
      process.nextTick(() => {
        req.emit('data', '{invalid json')
        req.emit('end')
      })
      await assert.rejects(parseBody(req), { name: 'SyntaxError' })
    })

    it('should reject on request error', async () => {
      const req = new EventEmitter()
      req.method = 'POST'
      process.nextTick(() => req.emit('error', new Error('connection error')))
      await assert.rejects(parseBody(req), { message: 'connection error' })
    })
  })
})
