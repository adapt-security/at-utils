import cloneRepo from './cloneRepo.js'
import exec from './exec.js'
import path from 'path'

export default async function installLocalModules (options) {
  const dir = path.join(options.cwd, 'local_adapt_modules')
  await Promise.all(options.modules.map(m => cloneRepo({ repo: m, cwd: path.join(dir, m), cleanInstall: false })))
  return exec('npm install', options.cwd) // need to run another npm install to pull in the local repos
}