import CliCommand from '../lib/CliCommand.js';
import Utils from '../lib/Utils.js';

export default class Install extends CliCommand {
  get config() {
    return {
      ...super.config,
      description: 'Registers a super user account',
      getReleaseData: false
    };
  }
  async runTask() {
    await Utils.registerSuperUserCmd();
    console.log(`Super user registered successfully.`);
  }
}