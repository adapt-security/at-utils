import { createInterface } from 'readline'
import { pathToFileURL } from 'url'
import path from 'path'
import prompts from 'prompts'
import startApp from './startApp.js'

export default async function registerSuperUser (options = {}) {
  try {
    await internalApiRequest('', undefined, { ...options, method: 'GET' })
  } catch (e) {
    if (e.code !== 'ECONNREFUSED') throw e
    await startApp(options)
  }
  let email = options.superEmail
  let password = options.pipePasswd ? await getPipedPassword() : options.superPassword
  let success = false
  while (!success) {
    try {
      if (!email) {
        const { emailInput } = await await prompts([{
          type: 'text',
          name: 'emailInput',
          message: 'Enter an email address to be used as a login for the Super User account'
        }])
        email = emailInput
      }
      if (!password) {
        const { passwordInput1, passwordInput2 } = await prompts([{
          type: 'password',
          name: 'passwordInput1',
          message: 'Enter a password for the Super User account'
        }, {
          type: 'password',
          name: 'passwordInput2',
          message: 'Please type the password again to confirm'
        }])
        if (passwordInput1 !== passwordInput2) {
          console.log('Passwords don\'t match. Please try again')
          continue
        }
        password = passwordInput1
      }
      await internalApiRequest('auth/local/registersuper', { email, password }, options)
      success = true
    } catch (e) {
      if (e.code !== 'VALIDATION_FAILED') throw e // only loop if it's a validation error
      console.log(`\nERROR: Failed to register super user, ${e.data.errors}\n`)
    }
  }
}

function getPipedPassword () {
  return new Promise(resolve => {
    createInterface({ input: process.stdin, output: process.stdout, terminal: false })
      .on('line', s => resolve(s))
  })
}

async function internalApiRequest (endpoint, data, opts = {}) {
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
