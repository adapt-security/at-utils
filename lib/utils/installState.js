import fs from 'fs/promises'
import path from 'path'

const STATE_FILE = '.install-state.json'

function getStatePath (cwd) {
  return path.resolve(cwd, 'conf', STATE_FILE)
}

export async function getInstallState (cwd) {
  try {
    return JSON.parse(await fs.readFile(getStatePath(cwd), 'utf8'))
  } catch (e) {
    return null
  }
}

export async function saveInstallState (cwd, state) {
  const statePath = getStatePath(cwd)
  await fs.mkdir(path.dirname(statePath), { recursive: true })
  await fs.writeFile(statePath, JSON.stringify({ ...state, timestamp: new Date().toISOString() }))
}

export async function clearInstallState (cwd) {
  try {
    await fs.unlink(getStatePath(cwd))
  } catch (e) {}
}
