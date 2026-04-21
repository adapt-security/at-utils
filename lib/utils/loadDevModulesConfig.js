import fs from 'fs/promises'
import path from 'path'

/**
 * Looks for a repos.json config file in the umbrella install root. Used by
 * headless dev installs to determine which workspace modules to clone and
 * where to clone them from. Returns null if the file isn't present, so the
 * interactive/discovery flow can still run.
 */
export default async function loadDevModulesConfig (cwd) {
  const configPath = path.resolve(cwd, 'repos.json')
  try {
    return JSON.parse(await fs.readFile(configPath, 'utf8'))
  } catch (e) {
    if (e.code === 'ENOENT') return null
    throw e
  }
}
