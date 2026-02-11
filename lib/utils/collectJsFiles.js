import { globSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Recursively collect all .js files under a directory
 */
export default function collectJsFiles (dir) {
  const pattern = join(dir, '**', '*.js')
  return globSync(pattern)
}
