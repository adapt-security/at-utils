import CliCommand from '../lib/CliCommand.js';
import fs from 'fs/promises';
import UiServer from '../lib/UiServer.js';
import Utils from '../lib/Utils.js';

export default class Install extends CliCommand {
  get config() {
    return {
      ...super.config,
      description: 'Installs the application into destination directory',
      params: { destination: 'The destination folder for the install' }
    };
  }
  async runTask() {
    if(this.options.ui) {
      return new UiServer(this.options)
        .on('exit', this.cleanUp);
    }
    if(this.options.devMode) {
      console.log('IMPORTANT: dev mode flag currently has no effect when running in headless mode\n');
    }
    try {
      await Utils.checkPrerequisites();
    } catch(e) {
      console.log(`\n${e.errors.map(e2 => e2.message).join('\n')}\n`);
      throw e;
    }
    try {
      if(!this.options.tag) this.options.tag = await this.getReleaseInput();

      console.log(`Installing Adapt authoring tool ${this.options.tag} in ${this.options.cwd}`);
      await this.cloneRepo();
      // create super admin
      await Utils.startApp(this.options.cwd);
      await Utils.registerSuperUserCmd(this.options.cwd);

      this.cleanUp();
    } catch(e) {
      this.cleanUp(e);
    }
  }
  async cleanUp(error) {
    if(error) {
      console.log('Install failed, performing cleanup operation');
      try { // for obvious reasons don't remove dest if git clone threw EEXIST
        if(error.code !== 'GITCLONEEEXIST') {
          console.log('- Removing broken install files');
          await fs.rm(this.options.cwd, { recursive: true, force: true });
          console.log('- Reinstating original config file');
          if(this.configContents) await fs.writeFile(path.resolve(this.options.cwd, `conf/${process.env.NODE_ENV}.config.js`), this.configContents);
        }
      } catch(e) {
        console.log('Oh dear, cleanup failed.\n');
        console.trace(e);
      }
    }
    super.cleanUp(error);
  }
}