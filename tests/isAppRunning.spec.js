import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

let requestError

// mock internalApiRequest before importing isAppRunning
mock.module('../lib/utils/internalApiRequest.js', {
  defaultExport: async () => {
    if (requestError) throw requestError
  }
})

const { default: isAppRunning } = await import('../lib/utils/isAppRunning.js')

/** Builds the error internalApiRequest throws for a non-2xx response */
function httpError (code, statusCode) {
  const e = new Error(code)
  e.code = code
  e.statusCode = statusCode
  return e
}

/** Builds the error fetch throws when it can't connect */
function transportError (code) {
  const e = new TypeError('fetch failed')
  e.cause = Object.assign(new Error(code), { code })
  return e
}

describe('isAppRunning', () => {
  it('should return true when the request succeeds', async () => {
    requestError = undefined
    assert.equal(await isAppRunning(), true)
  })

  it('should return true when the app responds with an auth error', async () => {
    requestError = httpError('MISSING_AUTH_HEADER', 401)
    assert.equal(await isAppRunning(), true)
  })

  it('should return true for any other error status', async () => {
    for (const [code, status] of [['UNAUTHORISED', 403], ['NOT_FOUND', 404], ['SERVER_ERROR', 500]]) {
      requestError = httpError(code, status)
      assert.equal(await isAppRunning(), true)
    }
  })

  it('should return false when the connection is refused', async () => {
    requestError = transportError('ECONNREFUSED')
    assert.equal(await isAppRunning(), false)
  })

  it('should rethrow errors which are neither a response nor a refused connection', async () => {
    requestError = new Error('Cannot find module conf/production.config.js')
    await assert.rejects(() => isAppRunning(), /Cannot find module/)
  })

  it('should rethrow other transport errors', async () => {
    requestError = transportError('EHOSTUNREACH')
    await assert.rejects(() => isAppRunning(), e => e.cause.code === 'EHOSTUNREACH')
  })
})
