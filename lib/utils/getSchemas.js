import fs from 'fs/promises'
import loadPackage from './loadPackage.js'
import loadJson from './loadJson.js'
import path from 'path'

export default async function getSchemas (rootDir) {
  const schemas = { config: {}, user: {} }
  const configSchemaPaths = await getConfigSchemaPathsRecursive(path.resolve(rootDir, 'node_modules'))
  await Promise.all(configSchemaPaths.map(async s => {
    const { name, version, description } = await loadPackage(path.resolve(path.dirname(s), '..'))
    const schema = await loadJson(s)
    schemas.config[name] = { name, description, version, schema }
  }))
  schemas.user = {
    properties: {
      superUser: {
        title: 'superuser',
        type: 'object',
        properties: {
          email: { description: 'Email address for the user', type: 'string', format: 'email' },
          password: { description: 'Password for the user', type: 'string', format: 'password' },
          confirmPassword: { description: 'Re-enter password', type: 'string', format: 'password' }
        },
        required: ['email', 'password', 'confirmPassword']
      }
    }
  }
  return schemas
}

async function getConfigSchemaPathsRecursive (dir, files = []) {
  const relativeSchemaPath = path.join('conf', 'config.schema.json')
  const contents = await fs.readdir(dir)
  await Promise.all(contents.map(async c => {
    const fullPath = path.resolve(dir, c)
    if ((await fs.stat(fullPath)).isDirectory()) return getConfigSchemaPathsRecursive(fullPath, files)
    if (fullPath.endsWith(relativeSchemaPath)) files.push(fullPath)
  }))
  return files
}
