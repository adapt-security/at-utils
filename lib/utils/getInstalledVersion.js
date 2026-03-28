import fs from 'fs/promises'
import path from 'path'

const VERSION_FILE = path.join('conf', '.version')

export default async function getInstalledVersion (cwd) {
  try {
    return (await fs.readFile(path.join(cwd, VERSION_FILE), 'utf8')).trim()
  } catch (e) {
    return null
  }
}

export async function writeInstalledVersion (cwd, version) {
  const filePath = path.join(cwd, VERSION_FILE)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, version)
}
