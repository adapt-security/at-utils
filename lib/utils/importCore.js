import { pathToFileURL } from 'url'
import path from 'path'

export default function importCore () {
  return import(pathToFileURL(path.join(root, 'node_modules', 'adapt-authoring-core', 'index.js')))
}