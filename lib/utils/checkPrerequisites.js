import loadPackage from './loadPackage.js'
import getCliRoot from './getCliRoot.js'
import exec from './exec.js'

import semver from 'semver'

export default async function checkPrerequisites (options = {}) {
  const { prerequisites: prereqs } = await loadPackage(getCliRoot())
  const failedPrereqs = (await Promise.allSettled(Object.entries(prereqs).map(async ([name, version]) => {
    let data
    try {
      data = await exec(`${name} --version`)
    } catch (e) {
      throw new Error(`Missing prerequisite '${name}'`)
    }
    const match = data.match(/(\d+\.\d+\.\d+)\D/)
    const installedVersion = match && match[1]
    if (!semver.satisfies(installedVersion, version)) {
      throw new Error(`Installed version of ${name} (${installedVersion}) doesn't satisfy required version (${version})`)
    }
  }))).filter(p => p.status === 'rejected').map(p => p.reason)
  if (failedPrereqs.length) {
    const msg = failedPrereqs.reduce((m, e2) => `${m}- ${e2.message}\n`, 'Prerequisite check failed:\n')
    if (options.ignorePrereqs) {
      console.log(msg)
      console.log('WARNING: --ignore-prereqs flag passed so process will continue')
      console.log('WARNING: If issues are encountered please make sure the correct prerequisites are installed\n')
      return
    }
    throw new Error(msg)
  }
}