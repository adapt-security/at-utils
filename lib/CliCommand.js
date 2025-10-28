import { exec } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import prompts from 'prompts'
import Utils from './Utils.js'

export default class CliCommand {
  get config () {
    return {
      description: undefined, // String, A human-readable description of the command
      options: [], // 2d array, e.g. [['--option', 'Option description ]]
      params: {} // Object, e.g. { param: 'Param description' }
    }
  }

  async run (...args) {
    await this.setOptions(args)
    await Utils.checkPrerequisites(this.options)
    await this.runTask()
  }

  async runTask () {
    throw new Error('Should be overridden in subclass')
  }

  async setOptions (args) {
    const paramKeys = Object.keys(this.config.params)
    const params = paramKeys.reduce((m, k, i) => Object.assign(m, { [k]: args[i] }), {})
    const [opts, command] = args.slice(paramKeys.length)
    if (opts.devMode) {
      opts.branches = opts.drafts = opts.prerelease = true
    }
    const dest = params.destination
    delete params.destination
    this.options = {
      ...opts,
      ...params,
      action: command.name(),
      cwd: dest ? path.resolve(dest) : process.cwd()
    }
    if (this.config.getReleaseData !== false) this.options.releaseData = await this.getReleaseData()
  }

  async cloneRepo () {
    const configPath = path.resolve(this.options.cwd, 'conf', `${process.env.NODE_ENV}.config.js`)
    try {
      this.configContents = await fs.readFile(configPath)
    } catch (e) {
      throw e.code === 'ENOENT' ? new Error(`Expected config file at '${configPath}'`) : e
    }
    // remove config because git clone won't work
    await fs.rm(path.dirname(configPath), { recursive: true })
    await Utils.cloneRepo(this.options)
    // reinstate config
    await fs.mkdir(path.dirname(configPath))
    await fs.writeFile(configPath, this.configContents)
  }

  async updateRepo () {
    Utils.updateRepo(this.options)
  }

  async getReleaseData () {
    let currentVersion
    try {
      currentVersion = (await Utils.exec('git symbolic-ref -q --short HEAD || git describe --tags --exact-match', this.options.cwd)).trim()
    } catch (e) {}
    return {
      currentVersion,
      releases: await Utils.getReleases({ ...this.options, currentVersion })
    }
  }

  async getReleaseInput () {
    const { release } = await this.getInput([{
      type: 'select',
      name: 'release',
      message: 'Choose a release',
      choices: this.options.releaseData.releases.map(r => { return { title: r.name, value: r } })
    }])

    console.log(`!! SELECTED RELEASE: ${release.name} (${release.published_at})\n\n${release.body}\n\n${'-'.repeat(80)}\n`)

    if (release) {
      const { confirmed } = await this.getInput([{
        type: 'confirm',
        name: 'confirmed',
        message: 'Would you like to continue?',
        initial: false
      }], (release.branch || release.draft || release.prerelease) ? 'WARNING! YOU HAVE CHOSEN TO INSTALL A NON-STABLE VERSION WHICH IS NOT SUITABLE FOR PRODUCTION. PLEASE PROCEED WITH CAUTION.' : '')
      console.log('\n')
      if (confirmed) return release.tag_name
    }
    console.log('\nGoodbye.')
    this.cleanUp(new Error('User cancelled install'))
  }

  async getInput (configs, message) {
    if (message) {
      console.log('\n', message, '\n')
    }
    return prompts(configs)
  }

  async exec (command, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd }, (error, stdout, stderr) => error ? reject(new Error(stderr) || error) : resolve(stdout))
    })
  }

  async cleanUp (error) {
    if (error) {
      console.log('\n')
      console.trace(error)
      console.log('\n')
    } else {
      const cmds = Utils.getStartCommands(this.options.cwd)
      let msg = `\nGood news, the ${this.options.action} completed successfully! To start the app, run the following commands:\n\n`
      Object.entries(cmds).forEach(([platform, cmd]) => {
        msg += `${platform}:\n${cmd}\n\n`
      })
      console.log(msg)
    }
    console.log('Goodbye!')
    process.exitCode = error ? 1 : 0
    process.exit()
  }
}
