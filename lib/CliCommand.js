import path from 'path'
import prompts from 'prompts'
import checkPrerequisites from './utils/checkPrerequisites.js'
import getInstalledVersion from './utils/getInstalledVersion.js'
import getReleases from './utils/getReleases.js'
import getStartCommands from './utils/getStartCommands.js'

export default class CliCommand {
  get config () {
    return {
      description: undefined,
      options: [],
      params: {},
      checkPrerequisites: false,
      getReleaseData: false
    }
  }

  async run (...args) {
    try {
      this.setOptions(args)
      if (this.config.checkPrerequisites) await checkPrerequisites(this.options)
      if (this.config.getReleaseData) this.options.releaseData = await this.getReleaseData()
      await this.runTask()
    } catch (e) {
      this.cleanUp(e)
    }
  }

  async runTask () {
    throw new Error('Should be overridden in subclass')
  }

  setOptions (args) {
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
  }

  async getReleaseData () {
    const currentVersion = await getInstalledVersion(this.options.cwd)
    return {
      currentVersion,
      releases: await getReleases({ ...this.options, currentVersion })
    }
  }

  async getReleaseInput () {
    const { release } = await this.getInput([{
      type: 'select',
      name: 'release',
      message: 'Choose a release',
      choices: this.options.releaseData.releases.map(r => { return { title: r.bump ? `${r.name} (${r.bump})` : r.name, value: r } })
    }])

    if (!release) {
      console.log('\nGoodbye.')
      this.cleanUp(new Error('User cancelled install'))
      return
    }

    console.log(`!! SELECTED RELEASE: ${release.name} (${release.date instanceof Date && !isNaN(release.date) ? release.date.toISOString().split('T')[0] : release.published_at})`)
    if (release.bump) console.log(`!! UPDATE TYPE: ${release.bump}`)
    console.log(`\n${release.body}\n\n${'-'.repeat(80)}\n`)

    let warning = ''
    if (release.branch || release.draft || release.prerelease) {
      warning = 'WARNING! YOU HAVE CHOSEN TO INSTALL A NON-STABLE VERSION WHICH IS NOT SUITABLE FOR PRODUCTION. PLEASE PROCEED WITH CAUTION.'
    } else if (release.bump === 'major') {
      warning = 'WARNING! This is a MAJOR version update which may include breaking changes. Please review the release notes carefully and ensure you have a backup before proceeding.'
    }
    const { confirmed } = await this.getInput([{
      type: 'confirm',
      name: 'confirmed',
      message: 'Would you like to continue?',
      initial: false
    }], warning)
    console.log('\n')
    if (confirmed) return release.tag_name

    console.log('\nGoodbye.')
    this.cleanUp(new Error('User cancelled install'))
  }

  async getInput (configs, message) {
    if (message) {
      console.log('\n', message, '\n')
    }
    return prompts(configs)
  }

  logSuccess (message) {
    const cmds = getStartCommands(this.options.cwd)
    let msg = `\n${message} To start the app, run the following commands:\n\n`
    Object.entries(cmds).forEach(([platform, cmd]) => {
      msg += `${platform}:\n${cmd}\n\n`
    })
    console.log(msg)
  }

  cleanUp (error) {
    if (error) {
      console.log('\n')
      console.trace(error)
      console.log('\n')
    }
    process.exitCode = error ? 1 : 0
  }
}
