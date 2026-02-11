import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Build a map of package name -> { version, dir } for all local modules
 */
export default function buildPackageIndex (rootDir) {
  const index = new Map()
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const pkgPath = join(rootDir, entry.name, 'package.json')
    if (!existsSync(pkgPath)) continue
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      if (pkg.name) {
        index.set(pkg.name, { version: pkg.version, dir: entry.name })
      }
    } catch {}
  }
  return index
}
