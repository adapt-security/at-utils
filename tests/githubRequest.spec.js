import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import githubRequest from '../lib/utils/githubRequest.js'

describe('githubRequest', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  describe('rate limit handling', () => {
    it('should throw a descriptive error on HTTP 429', async () => {
      globalThis.fetch = async () => ({
        status: 429,
        statusText: 'Too Many Requests',
        headers: { get: () => null },
        json: async () => ({})
      })
      await assert.rejects(
        githubRequest('releases'),
        e => {
          assert.match(e.message, /rate limit exceeded/i)
          return true
        }
      )
    })

    it('should throw a descriptive error on HTTP 403 with X-RateLimit-Remaining: 0', async () => {
      globalThis.fetch = async () => ({
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: (h) => h === 'X-RateLimit-Remaining' ? '0' : null
        },
        json: async () => ({})
      })
      await assert.rejects(
        githubRequest('releases'),
        e => {
          assert.match(e.message, /rate limit exceeded/i)
          return true
        }
      )
    })

    it('should include reset time in rate limit error when X-RateLimit-Reset header is present', async () => {
      const resetEpoch = Math.floor(Date.now() / 1000) + 3600
      globalThis.fetch = async () => ({
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (h) => h === 'X-RateLimit-Reset' ? String(resetEpoch) : null
        },
        json: async () => ({})
      })
      await assert.rejects(
        githubRequest('releases'),
        e => {
          assert.match(e.message, /rate limit resets at/i)
          return true
        }
      )
    })

    it('should include hint about GITHUB_USER and GITHUB_TOKEN in rate limit error', async () => {
      globalThis.fetch = async () => ({
        status: 429,
        statusText: 'Too Many Requests',
        headers: { get: () => null },
        json: async () => ({})
      })
      await assert.rejects(
        githubRequest('releases'),
        e => {
          assert.match(e.message, /GITHUB_USER/)
          assert.match(e.message, /GITHUB_TOKEN/)
          return true
        }
      )
    })

    it('should use response body message for non-rate-limit errors when available', async () => {
      globalThis.fetch = async () => ({
        status: 404,
        statusText: 'Not Found',
        headers: { get: () => null },
        json: async () => ({ message: 'Repository not found' })
      })
      await assert.rejects(
        githubRequest('releases'),
        { message: 'Repository not found' }
      )
    })

    it('should fall back to statusText for non-rate-limit errors when body has no message', async () => {
      globalThis.fetch = async () => ({
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: () => null },
        json: async () => ({})
      })
      await assert.rejects(
        githubRequest('releases'),
        { message: 'Internal Server Error' }
      )
    })

    it('should not throw a rate limit error on HTTP 403 with X-RateLimit-Remaining non-zero', async () => {
      globalThis.fetch = async () => ({
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: (h) => h === 'X-RateLimit-Remaining' ? '10' : null
        },
        json: async () => ({ message: 'Resource not accessible by integration' })
      })
      await assert.rejects(
        githubRequest('releases'),
        e => {
          assert.doesNotMatch(e.message, /rate limit exceeded/i)
          return true
        }
      )
    })
  })
})
