import CliCommand from '../lib/CliCommand.js'
import checkSchemaForDuplicates from '../lib/utils/checkSchemaForDuplicates.js'

export default class Schemacheck extends CliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Checks for duplicate schema properties'
    }
  }

  async runTask () {
    console.log('Checking for duplicate schema definitions.\n')

    process.env.ADAPT_AUTHORING_LOGGER__mute = 'true'

    const { App } = await import('adapt-authoring-core')
    const app = await App.instance.onReady()
    const schema = await app.waitForModule('jsonschema')

    await Promise.allSettled(Object.keys(schema.schemaPaths).map(async s => {
      const usedKeys = {}
      const hierarchy = await schema.loadSchemaHierarchy(s)
      hierarchy.forEach(h => checkSchemaForDuplicates(h, usedKeys))
      const duplicates = Object.entries(usedKeys).filter(([key, uses]) => uses.length > 1)

      if (duplicates.length) {
        console.log(`Schema '${s}' contains duplicate definitions for the following properties:`)
        duplicates.forEach(([prop, schemas]) => console.log(` - ${prop}: ${schemas}`))
        console.log('')
        process.exitCode = 1
      }
    }))
    if (process.exitCode !== 1) console.log('No duplicates found.')
    process.exit()
  }
}
