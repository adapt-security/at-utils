import CliCommand from '../lib/CliCommand.js'
import DEFAULT_OPTIONS from '../lib/DEFAULT_OPTIONS.js'
import Installer from '../lib/Installer.js'
import UiServer from '../lib/UiServer.js'

export default class Update extends CliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Updates the application in destination directory',
      params: { destination: 'The destination folder for the source code' },
      checkPrerequisites: true,
      getReleaseData: true,
      options: [
        ...DEFAULT_OPTIONS,
        ['-d --dry-run', 'Check for update without performing any update actions'],
        ['--patch-only', 'Only show patch releases'],
        ['--minor-only', 'Only show patch and minor releases']
      ]
    }
  }

  async runTask () {
    if (!this.options.releaseData.currentVersion) {
      throw new Error(`Adapt authoring tool install not found in ${this.options.cwd}`)
    }
    if (this.options.ui) {
      return new UiServer(this.options)
        .on('exit', e => this.cleanUp(e))
    }
    if (!this.options.releaseData.releases.length) {
      console.log('No updates available.')
      return
    }
    const latestRelease = this.options.releaseData.releases[0]

    if (latestRelease.tag_name === this.options.releaseData.currentVersion) {
      return console.log(`You are already using the latest version (${this.options.releaseData.currentVersion}). Nothing to do`)
    }
    console.log(`You are using ${this.options.releaseData.currentVersion}, but ${latestRelease.tag_name}${latestRelease.bump ? ` (${latestRelease.bump})` : ''} is now available!\n`)

    if (this.options.dryRun) {
      return
    }
    try {
      if (!this.options.tag) this.options.tag = await this.getReleaseInput()

      console.log(`Updating Adapt authoring tool in ${this.options.cwd}\n`)
      await new Installer(this.options).update()

      this.logSuccess('Update completed successfully!')
    } catch (e) {
      this.cleanUp(e)
    }
  }
}
