import { pathToFileURL } from 'url'
import path from 'path'

export default async function internalApiRequest (endpoint, data, opts = {}) {
  const options = {
    method: opts.method ?? 'POST',
    headers: opts.headers ?? { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined
  }
  const config = (await import(pathToFileURL(path.join(opts.cwd ?? process.cwd(), 'conf', `${process.env.NODE_ENV}.config.js`)))).default
  const { host, port } = config['adapt-authoring-server']
  const response = await fetch(`http://${host}:${port}/api/${endpoint}`, options)
  if (response.status === 204) {
    return
  }
  if (response.status > 299) {
    const responseData = await response.json()
    const e = new Error(responseData.message)
    e.code = responseData.code
    e.statusCode = response.status
    throw e
  }
}
