import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Check if a directory is a valid module by testing for adapt-authoring.json
 */
export default function isModule (dir) {
  return existsSync(join(dir, 'adapt-authoring.json'))
}
