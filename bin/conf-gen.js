import SimpleCliCommand from '../lib/SimpleCliCommand.js'
import storeDefaults from '../lib/utils/storeDefaults.js'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { globSync } from 'glob'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export default class Confgen extends SimpleCliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Generates a template config file which can be populated with required values',
      options: [
        ['--env <environment>', 'The environment to write the config for (defaults to NODE_ENV)'],
        ['--defaults', 'Include default values'],
        ['--replace', 'Override any existing values'],
        ['--update', 'Update existing configuration with any missing values']
      ]
    }
  }

  async runTask () {
    const env = this.options.env || process.env.NODE_ENV
    if (!env) {
      return console.log('ERROR: environment must be specified via --env or NODE_ENV\n')
    }
    if (this.options.replace && this.options.update) {
      return console.log('ERROR: --update and --replace cannot both be specified, please choose one and run the utility again')
    }
    if (this.options.defaults) {
      console.log('Default values will be included')
    }
    const confDir = path.resolve('conf')
    const outpath = path.join(confDir, `${env}.config.js`)
    const configJson = {}

    let isExistingConfig = false
    let existingConfig
    try {
      existingConfig = (await import(pathToFileURL(outpath).href)).default
      isExistingConfig = true
    } catch (e) {
      console.log(`No config found for NODE_ENV '${env}'. File will be written to ${outpath}\n`)
    }
    if (isExistingConfig) {
      const msg = `Config already exists for NODE_ENV '${env}'. `
      if (this.options.replace) {
        console.log(`${msg}All existing values will be replaced.`)
      } else if (this.options.update) {
        console.log(`${msg}Any missing values will be added.`)
        Object.assign(configJson, existingConfig)
      } else {
        return console.log(`${msg}Must specifiy --replace or --update to make changes.`)
      }
    }
    try {
      this.generateConfig(configJson)
      await fsp.mkdir(confDir, { recursive: true })
      await fsp.writeFile(outpath, `export default ${JSON.stringify(configJson, null, 2)};`)
      console.log(`Config file written successfully to ${outpath}.\n`)
      this.logRequired(configJson)
    } catch (e) {
      console.log(`ERROR: Failed to write ${outpath}\n${e}`)
    }
  }

  logRequired (configJson) {
    const requiredAttrs = []
    Object.entries(configJson).forEach(([name, config]) => {
      Object.entries(config).forEach(([key, value]) => value === null && requiredAttrs.push(`${name}.${key}`))
    })
    if (requiredAttrs.length) {
      console.log('Note: the following required attributes have been given a value of null and must be set for the application to run:\n')
      console.log(requiredAttrs.join('\n'))
      console.log('')
    }
  }

  getDeps () {
    try {
      const depRoot = `${process.cwd()}/node_modules/`.replaceAll(path.sep, path.posix.sep)
      return globSync(`${depRoot}**/adapt-authoring.json`).map(f => {
        const dirname = path.dirname(f)
        return [dirname.replace(depRoot, ''), dirname]
      })
    } catch (e) {
      console.log('Failed to load package', e)
      return []
    }
  }

  generateConfig (configJson) {
    for (const [name, dir] of this.getDeps()) {
      let schema
      try {
        schema = JSON.parse(fs.readFileSync(path.resolve(dir, 'conf/config.schema.json')))
      } catch (e) {
        continue
      }
      if (!configJson[name]) {
        configJson[name] = {}
      }
      storeDefaults(schema, configJson[name], { replace: this.options.replace, useDefaults: this.options.defaults })
    }
    // remove any empty objects
    Object.entries(configJson).forEach(([key, config]) => !Object.keys(config).length && delete configJson[key])
  }
}
