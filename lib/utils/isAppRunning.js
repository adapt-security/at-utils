import internalApiRequest from './internalApiRequest.js'

/**
 * Checks whether an app instance is already listening on the configured host/port.
 *
 * Any HTTP response means something is serving, including an error status: the probe requests
 * the API endpoint map, which requires authentication, so an unauthenticated probe is answered
 * with a 401 rather than a 200. Only a refused connection means nothing is listening.
 *
 * @param {Object} options Options to pass to the request
 * @return {Promise<Boolean>} Whether an app instance is already running
 */
export default async function isAppRunning (options = {}) {
  try {
    await internalApiRequest('', undefined, { ...options, method: 'GET' })
  } catch (e) {
    if (e.statusCode !== undefined) return true
    if ((e.code ?? e.cause?.code) === 'ECONNREFUSED') return false
    throw e
  }
  return true
}
