import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import isModule from './isModule.js'

/**
 * Scan child directories for valid modules (dirs containing adapt-authoring.json)
 */
export default function getModuleDirs (parentDir) {
  return readdirSync(parentDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => join(parentDir, e.name))
    .filter(dir => isModule(dir))
}
