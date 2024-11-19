import fs from 'fs/promises'
import path from 'path'

export default async function saveConfig (rootDir, data) {
  const configDir = path.resolve(rootDir, 'conf')
  const configPath = path.resolve(configDir, `${process.env.NODE_ENV}.config.js`)
  try {
    await fs.mkdir(configDir, { recursive: true })
  } catch (e) {} // not a problem
  await fs.writeFile(configPath, `export default ${JSON.stringify(data, null, 2)};`)
}