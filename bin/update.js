import prompts from 'prompts';
import semver from 'semver';
import UiServer from '../lib/UiServer.js';
import Utils from '../lib/Utils.js';

import CliCommand from '../lib/CliCommand.js';

export default class Update extends CliCommand {
  get config() {
    return {
      ...super.config,
      description: 'Updates the application in destination directory',
      params: { destination: 'The destination folder for the source code' },
      options: [['-d --dry-run', 'Check for update without performing any update actions' ]]
    };
  }
  async runTask() {
    if(this.options.ui) {
      return new UiServer(this.options)
        .on('exit', this.cleanUp);
    }
    const releaseData = await this.getVersions();
    if(!releaseData.latestCompatibleVersion) {
      return console.log(`You are already using the latest version (${releaseData.currentVersion}). Nothing to do`);
    }
    console.log(`You are using ${releaseData.currentVersion}, but ${releaseData.latestCompatibleVersion} is now available!`);
    
    if(this.options.dryRun) {
      return;
    }
    console.log(`Updating Adapt authoring tool in ${this.options.cwd}`);
    try {
      const { tag } = await prompts([{
        type: 'select',
        name: 'tag',
        message: 'Choose a release to update to',
        initial: latestCompatibleVersion,
        choices: newerVersions
      }]);
      await Utils.updateRepo(tag, this.options.cwd);
    } catch(e) {
      cleanUp(e);
    }  
  }
  async getVersions() {
    const data = {};
    try {
      data.currentVersion = (await Utils.loadPackage(this.options.cwd)).version;
    } catch(e) {
      throw new Error(`Couldn't determine current version`);
    }
    const releases = await Utils.getReleases({ ...this.options, currentVersion: data.currentVersion });
    data.newerVersions = releases.map((r,i) => {
      const isCompatible = semver.satisfies(`^${data.currentVersion}`, r.tag_name);
      const isGreater = semver.gt(releases[data.latestCompatibleVersion].tag_name, r.tag_name);
      if(isCompatible && isGreater) data.latestCompatibleVersion = i;
      return { title: r.name, value: r.tag_name };
    });
    return data;
  }
  async cleanUp(error) {
    if(error) {
      console.log(`Update failed, ${error}`);
    } else {
      console.log(`Application updated successfully.`);
    }
    process.exit();
  }
}