import fs from 'fs/promises'
import path from 'path'

export default async function getAppDependencies (cwd) {
  const deps = { adapt: {}, all: {}, dev: {} }
  const adaptDeps = await getAdaptDepsRecursive(path.join(cwd, 'node_modules'))
  await Promise.all(adaptDeps.map(async d => {
    const { name, version, dependencies, devDependencies } = await JSON.parse(await fs.readFile(path.join(d, 'package.json')))
    deps.adapt[name] = version
    ;[[dependencies, deps.all], [devDependencies, deps.dev]].forEach(([deps = {}, memo]) => {
      Object.entries(deps).forEach(([k, v]) => {
        if (!memo[k]) memo[k] = []
        if (!memo[k].includes(v)) memo[k].push(v)
        memo[k] = memo[k].sort()
      })
    })
  }))
  processDeps(deps)
  const adaptKeys = Object.keys(deps.adapt)
  Object.keys(deps.all).forEach(k => {
    if (adaptKeys.includes(k)) delete deps.all[k]
  })
  return deps
}
  
async function getAdaptDepsRecursive (dir, dirs = []) {
  const metaFilename = 'adapt-authoring.json'
  const contents = await fs.readdir(dir)
  await Promise.all(contents.map(async c => {
    const fullPath = path.resolve(dir, c)
    if ((await fs.stat(fullPath)).isDirectory()) return getAdaptDepsRecursive(fullPath, dirs)
    if (fullPath.endsWith(metaFilename)) dirs.push(path.dirname(fullPath))
  }))
  return dirs
}

function processDeps (deps) {
  Object.entries(deps).forEach(([k, v]) => {
    const sorted = {}
    Object.keys(v).sort().forEach(d => {
      let versions = v[d]
      if (v[d].length === 1) versions = v[d][0]
      sorted[d] = versions
    })
    deps[k] = sorted
  })
}