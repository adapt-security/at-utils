import { exec as _exec } from 'child_process'

export default function exec (command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    _exec(command, { cwd }, (error, stdout, stderr) => error ? reject(new Error(error || stderr) || error) : resolve(stdout))
  })
}
