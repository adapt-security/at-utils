import CliCommand from './CliCommand.js'

export default class SimpleCliCommand extends CliCommand {
  async run (...args) {
    const paramKeys = Object.keys(this.config.params)
    const params = paramKeys.reduce((m, k, i) => Object.assign(m, { [k]: args[i] }), {})
    const [opts, command] = args.slice(paramKeys.length)
    this.options = { ...opts, ...params, action: command.name() }
    await this.runTask()
  }
}
