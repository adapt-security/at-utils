import fs from 'fs/promises'
import path from 'path'

function getStatePath (cwd) {
  return path.resolve(cwd, '.install-state.json')
}

export async function getInstallState (cwd) {
  try {
    return JSON.parse(await fs.readFile(getStatePath(cwd), 'utf8'))
  } catch (e) {
    return null
  }
}

export async function saveInstallState (cwd, state) {
  await fs.writeFile(getStatePath(cwd), JSON.stringify({ ...state, timestamp: new Date().toISOString() }))
}

export async function clearInstallState (cwd) {
  try {
    await fs.unlink(getStatePath(cwd))
  } catch (e) {}
}
