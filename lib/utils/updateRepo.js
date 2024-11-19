import exec from './exec.js'
import fs from 'fs/promises'

export default async function updateRepo (options) {
  console.log(`Checking out ${options.tag} in ${options.cwd}`)
  await exec('git fetch --all --tags', options.cwd)
  await exec('git reset --hard', options.cwd)
  await exec(`git checkout ${options.tag}`, options.cwd)
  await fs.rm(`${options.cwd}/node_modules`, { recursive: true })
  console.log('Installing npm dependencies')
  await exec('npm ci', options.cwd)
}
