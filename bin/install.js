import CliCommand from '../lib/CliCommand.js'
import DEFAULT_OPTIONS from '../lib/DEFAULT_OPTIONS.js'
import fs from 'fs/promises'
import path from 'path'
import UiServer from '../lib/UiServer.js'
import Utils from '../lib/Utils.js'

export default class Install extends CliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Installs the application into destination directory',
      params: { destination: 'The destination folder for the install' },
      options: [
        ...DEFAULT_OPTIONS,
        ['-e --super-email <email>', 'The admin user email address'],
        ['-p --pipe-passwd', 'Whether the admin password will be piped into the script']
      ]
    }
  }

  async runTask () {
    await this.handleExistingInstall()

    if (this.options.ui) {
      return new UiServer(this.options)
        .on('exit', e => this.cleanUp(e))
    }
    try {
      if (!this.options.tag) this.options.tag = await this.getReleaseInput()

      console.log(`Installing Adapt authoring tool ${this.options.tag} in ${this.options.cwd}`)
      await this.cloneRepo()
      if (this.options.devMode) await this.installDevModules()
      await Utils.registerSuperUser(this.options)
      await Utils.clearInstallState(this.options.cwd)

      this.cleanUp()
    } catch (e) {
      this.cleanUp(e)
    }
  }

  async installDevModules () {
    const modules = await Utils.loadDevModulesConfig(this.options.cwd)
    if (!modules?.length) {
      console.log('Dev mode: no repos.json found in install root, skipping local modules')
      return
    }
    console.log(`Dev mode: cloning ${modules.length} local modules from repos.json`)
    await Utils.installLocalModules({ ...this.options, modules })
  }

  async handleExistingInstall () {
    const checkpoint = await Utils.getInstallState(this.options.cwd)
    if (checkpoint) {
      const { resume } = await this.getInput([{
        type: 'confirm',
        name: 'resume',
        message: 'A previous install was interrupted. Resume from where you left off?',
        initial: true
      }])
      if (resume) {
        this.options.resumeStep = checkpoint.step
        return
      }
      await Utils.clearInstallState(this.options.cwd)
      await fs.rm(this.options.cwd, { recursive: true, force: true })
      await fs.mkdir(this.options.cwd, { recursive: true })
      return
    }
    let files
    try {
      files = await fs.readdir(this.options.cwd)
    } catch (e) {}
    if (files?.some(f => f !== 'conf')) throw new Error('Install directory must be empty')
  }

  async cleanUp (error) {
    if (error) {
      console.log('Install failed, performing cleanup operation')
      try { // for obvious reasons don't remove dest if git clone threw EEXIST
        if (error.code !== 'GITCLONEEEXIST') {
          console.log('- Removing broken install files')
          await fs.rm(this.options.cwd, { recursive: true, force: true })
          if (this.configContents) {
            console.log('- Reinstating original config file')
            await fs.writeFile(path.resolve(this.options.cwd, `conf/${process.env.NODE_ENV}.config.js`), this.configContents)
          }
        }
      } catch (e) {
        console.log('Oh dear, cleanup failed.\n')
        console.trace(e)
      }
    }
    super.cleanUp(error)
  }
}
