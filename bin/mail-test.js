import CliCommand from '../lib/CliCommand.js'
import internalApiRequest from '../lib/utils/internalApiRequest.js'

export default class MailTest extends CliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Sends a test email',
      params: { email: 'Recipient email address for the test' },
      options: [['--v --verbose', 'Include extra debug messages']]
    }
  }

  async runTask () {
    try {
      await internalApiRequest('mailer/test', { email: this.options.email })
      console.log('Email test successful')
    } catch (e) {
      console.log(`Email test failed with error code ${e.code} (${e.statusCode}):`)
      console.log(`\n${e.message}`)
      process.exitCode = 1
    }
  }
}
