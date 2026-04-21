import cloneRepo from './cloneRepo.js'
import exec from './exec.js'
import path from 'path'

export default async function installLocalModules (options) {
  const dir = path.join(options.cwd, 'local_adapt_modules')
  await Promise.all(options.modules.map(m => {
    const name = typeof m === 'string' ? m : m.name
    const url = typeof m === 'string' ? undefined : m.url
    const localDir = name.includes('/') ? name.split('/')[1] : name
    return cloneRepo({ repo: name, url, cwd: path.join(dir, localDir), cleanInstall: false })
  }))
  return exec('npm install', options.cwd) // need to run another npm install to pull in the local repos
}
