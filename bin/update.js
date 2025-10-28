import CliCommand from '../lib/CliCommand.js'
import DEFAULT_OPTIONS from '../lib/DEFAULT_OPTIONS.js'
import UiServer from '../lib/UiServer.js'
import Utils from '../lib/Utils.js'

export default class Update extends CliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Updates the application in destination directory',
      params: { destination: 'The destination folder for the source code' },
      options: [
        ...DEFAULT_OPTIONS,
        ['-d --dry-run', 'Check for update without performing any update actions']
      ]
    }
  }

  async runTask () {
    if (!this.options.releaseData.currentVersion) {
      throw new Error(`Adapt authoring tool install not found in ${this.options.cwd}`)
    }
    if (this.options.ui) {
      return new UiServer(this.options)
        .on('exit', this.cleanUp)
    }
    if (!this.options.releaseData.releases.length) {
      return this.cleanUp('No release data was retrievable.')
    }
    const latestRelease = this.options.releaseData.releases[0]

    if (latestRelease.tag_name === this.options.releaseData.currentVersion) {
      return console.log(`You are already using the latest version (${this.options.releaseData.currentVersion}). Nothing to do`)
    }
    console.log(`You are using ${this.options.releaseData.currentVersion}, but ${latestRelease.tag_name} is now available!\n`)

    if (this.options.dryRun) {
      return
    }
    console.log(`Updating Adapt authoring tool in ${this.options.cwd}\n`)
    try {
      if (!this.options.tag) this.options.tag = await this.getReleaseInput()
      await Utils.updateRepo(this.options)
      this.cleanUp()
    } catch (e) {
      this.cleanUp(e)
    }
  }
}
