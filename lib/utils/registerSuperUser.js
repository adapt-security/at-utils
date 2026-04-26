import { createInterface } from 'readline'
import prompts from 'prompts'
import internalApiRequest from './internalApiRequest.js'
import startApp from './startApp.js'

export default async function registerSuperUser (options = {}) {
  try {
    await internalApiRequest('', undefined, { ...options, method: 'GET' })
  } catch (e) {
    if ((e.code ?? e.cause?.code) !== 'ECONNREFUSED') throw e
    await startApp(options)
  }
  let email = options.superEmail
  let password = options.pipePasswd ? await getPipedPassword() : options.superPassword
  let success = false
  while (!success) {
    try {
      if (!email) {
        const { emailInput } = await prompts([{
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
