import CliCommand from '../lib/CliCommand.js';
import Utils from '../lib/Utils.js';

export default class Install extends CliCommand {
  get config() {
    return {
      ...super.config,
      description: 'Registers a super user account',
      options: [
        ['-e --super-email <email>', 'The admin user email address'],
        ['-p --pipe-passwd', 'Whether the admin password will be piped into the script']
      ],
      getReleaseData: false
    };
  }
  async runTask() {
    try {
      await Utils.registerSuperUserCmd(this.options);
      console.log(`Super user registered successfully.`);
      process.exitCode = 0;
    } catch(e) {
      console.log(`Super User registration failed with error code ${e.code} (${e.statusCode}):`);
      console.log(`\n${e.message}`);
      process.exitCode = 1;
    }
    
  }
}