import importCore from './importCore.js'

let app

export default async function startApp (options = {}) {
  if (!app) {
    const { App } = await importCore(options.cwd)
    try {
      if (options.verbose) {
        process.env.ADAPT_AUTHORING_LOGGER__levels = '["error","warn","success","info","debug"]'
      } else {
        process.env.ADAPT_AUTHORING_LOGGER__mute = true
      }
      process.env.ROOT_DIR = options.cwd
      await App.instance.onReady()
      app = App.instance
    } catch (e) {
      return console.log(e)
    }
  }
  return app
}
