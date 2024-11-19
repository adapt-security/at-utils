import path from 'path'

export default function getCliRoot () {
  return path.resolve(process.argv[1], '../../at-utils')
}