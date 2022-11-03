import CliCommand from '../lib/CliCommand.js';
import fs from 'fs/promises';
import path from 'path';
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
    try {
      try {
        await Utils.checkPrerequisites();
      } catch(e) {
        console.log(`\n${e.errors.map(e2 => e2.message).join('\n')}\n`);
        throw e;
      }
      if(!this.options.tag) {
        const [r] = await Utils.getReleases(this.options);
        this.options.tag = r.name.replace('branch:', '');
        if(r.prerelease) {
          const { value } = await this.getInput([{
            type: 'confirm',
            name: 'value',
            message: `Would you like to continue?`,
            initial: false
          }], 'WARNING! YOU HAVE CHOSEN TO INCLUDE PRERELEASE VERSIONS WHICH ARE NOT SUITABLE FOR PRODUCTION. PLEASE PROCEED WITH CAUTION.');
          if(!value) {
            console.log('\nGoodbye.');
            this.cleanUp(new Error('User cancelled install'));
          }
        }
      }
      console.log(`Installing Adapt authoring tool ${this.options.tag} in ${this.options.cwd}`);
      
      const configPath = path.resolve(this.options.cwd, 'conf', `${process.env.NODE_ENV}.config.js`);
      try {
        this.configContents = await fs.readFile(configPath);
      } catch(e) {
        throw e.code === 'ENOENT' ? new Error(`Expected config file at '${configPath}'`) : e;
      }
      // remove config because git clone won't work
      await fs.rm(path.dirname(configPath), { recursive: true });
      await this.cloneRepo();
      // reinstate config
      await fs.mkdir(path.dirname(configPath));
      await fs.writeFile(configPath, this.configContents);
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
      console.trace(error);
      try { // for obvious reasons don't remove dest if git clone threw EEXIST
        if(error.code !== 'GITCLONEEEXIST') {
          await fs.rm(this.options.cwd, { recursive: true, force: true });
          // reinstate the config file
          if(this.configContents) await Utils.saveConfig(this.options.cwd, this.configContents);
        }
      } catch(e) {
        console.trace(e);
      }
    } else {
      const cmds = Utils.getStartCommands(this.options.cwd);
      let msg = '\nApplication installed successfully. To start the app, run the following commands:\n\n';
      Object.entries(cmds).forEach(([platform, cmd]) => msg += `${platform}:\n${cmd}\n\n`);
      console.log(msg);
    }
    process.exit();
  }
}