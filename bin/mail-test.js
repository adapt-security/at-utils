import CliCommand from '../lib/CliCommand.js';
import Utils from '../lib/Utils.js';

export default class MailTest extends CliCommand {
  get config() {
    return {
      ...super.config,
      description: 'Sends a test email',
      params: { email: 'Recipient email address for the test' },
      getReleaseData: false
    };
  }
  async runTask() {
    try {
      await Utils.internalApiRequest(`mailer/test`, { email: this.options.email });
      console.log(`Email test successful`);
      process.exitCode = 0;
    } catch(e) {
      console.log(`Email test failed with error code ${e.code} (${e.statusCode}):`);
      console.log(`\n${e.message}`);
      process.exitCode = 1;
    }
  }
}