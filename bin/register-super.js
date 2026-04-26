import CliCommand from '../lib/CliCommand.js'
import registerSuperUser from '../lib/utils/registerSuperUser.js'

export default class RegisterSuper extends CliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Registers a super user account',
      checkPrerequisites: true,
      options: [
        ['-e --super-email <email>', 'The admin user email address'],
        ['--ignore-prereqs', 'Whether to skip the prerequisites check. Warning this could result in expected errors'],
        ['-p --pipe-passwd', 'Whether the admin password will be piped into the script'],
        ['--v --verbose', 'Include extra debug messages']
      ]
    }
  }

  async runTask () {
    try {
      await registerSuperUser(this.options)
      console.log('Super user registered successfully.')
    } catch (e) {
      console.log(`Super User registration failed with error code ${e.code} (${e.statusCode}):`)
      console.log(`\n${e.message}`)
      process.exitCode = 1
    }
  }
}
