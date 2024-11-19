import fs from 'fs/promises'

export default async function loadJson (filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath))
  } catch (e) {
    throw new Error(`Failed to load ${filePath}`)
  }
}