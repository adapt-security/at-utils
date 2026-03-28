import { randomBytes } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import prompts from 'prompts'
import CliCommand from '../lib/CliCommand.js'
import DEFAULT_OPTIONS from '../lib/DEFAULT_OPTIONS.js'
import Installer from '../lib/Installer.js'
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
        ['-e --super-email <email>', 'The admin user email address']
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
      await this.createSuperUser()

      this.logSuccess('Install completed successfully!')
    } catch (e) {
      this.cleanUp(e)
    }
  }

  async createSuperUser () {
    let email = this.options.superEmail
    if (!email) {
      const { emailInput } = await prompts([{
        type: 'text',
        name: 'emailInput',
        message: 'Enter an email address for the super admin account'
      }])
      email = emailInput
    }
    if (!email) throw new Error('Email is required for super admin account')

    const password = randomBytes(16).toString('base64url')
    const confDir = path.resolve(this.options.cwd, 'conf')
    await fs.mkdir(confDir, { recursive: true })
    await fs.writeFile(path.resolve(confDir, '.superuser'), JSON.stringify({ email, password }, null, 2))

    console.log('\nSuper admin account will be created on first app start.')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
    console.log('Please save this password. You will be asked to change it on first login.\n')
  }

  async checkTargetDir () {
    let files
    try {
      files = await fs.readdir(this.options.cwd)
    } catch (e) {}
    if (files?.some(f => f !== 'conf')) throw new Error('Install directory must be empty')
  }
}
