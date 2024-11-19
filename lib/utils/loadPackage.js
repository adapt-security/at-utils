import path from 'path'
import loadJson from './loadJson.js'

export default function loadPackage (filePath) {
  return loadJson(path.join(filePath, 'package.json'))
}