import { fileURLToPath } from 'url'
import path from 'path'

export default function getCliRoot () {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
}
