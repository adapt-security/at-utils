import CliCommand from '../lib/CliCommand.js'
import DEFAULT_OPTIONS from '../lib/DEFAULT_OPTIONS.js'
import fs from 'fs/promises'
import Installer from '../lib/Installer.js'
import registerSuperUser from '../lib/utils/registerSuperUser.js'
import UiServer from '../lib/UiServer.js'

export default class Install extends CliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Installs the application into destination directory',
      params: { destination: 'The destination folder for the install' },
      checkPrerequisites: true,
      getReleaseData: true,
      options: [
        ...DEFAULT_OPTIONS,
        ['-e --super-email <email>', 'The admin user email address'],
        ['-p --pipe-passwd', 'Whether the admin password will be piped into the script']
      ]
    }
  }

  async runTask () {
    await this.checkTargetDir()

    if (this.options.ui) {
      return new UiServer(this.options)
        .on('exit', e => this.cleanUp(e))
    }
    try {
      if (!this.options.tag) this.options.tag = await this.getReleaseInput()

      console.log(`Installing Adapt authoring tool ${this.options.tag} in ${this.options.cwd}`)
      await new Installer(this.options).install()
      await registerSuperUser(this.options)

      this.logSuccess('Install completed successfully!')
    } catch (e) {
      this.cleanUp(e)
    }
  }

  async checkTargetDir () {
    let files
    try {
      files = await fs.readdir(this.options.cwd)
    } catch (e) {}
    if (files?.some(f => f !== 'conf')) throw new Error('Install directory must be empty')
  }
}
