import CliCommand from '../lib/CliCommand.js';
import Utils from '../lib/Utils.js';

export default class MailTest extends CliCommand {
  get config() {
    return {
      ...super.config,
      description: 'Registers a super user account',
      params: { email: 'Recipient email address for the test' },
      getReleaseData: false
    };
  }
  async runTask() {
    try {
      await Utils.internalApiRequest(`auth/local/registersuper`, { email: this.options.email });
      console.log(this.options);
      console.log(`Email test successful`);
      process.exitCode = 0;
    } catch(e) {
      console.log(`Email test failed with error code ${e.code} (${e.statusCode}):`);
      console.log(`\n${e.message}`);
      process.exitCode = 1;
    }
  }
}