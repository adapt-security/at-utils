import loadPackage from './loadPackage.js'
import getCliRoot from './getCliRoot.js'
import exec from './exec.js'

import semver from 'semver'

export default async function checkPrerequisites (options = {}) {
  const { prerequisites: prereqs } = await loadPackage(getCliRoot())
  const errors = []
  const warnings = []

  await Promise.all(Object.entries(prereqs).map(async ([name, version]) => {
    let data
    try {
      data = await exec(`${name} --version`)
    } catch (e) {
      errors.push(`Missing prerequisite '${name}'`)
      return
    }
    const match = data.match(/(\d+\.\d+\.\d+)\D/)
    const installedVersion = match && match[1]
    if (!installedVersion) {
      errors.push(`Could not determine version of ${name}`)
      return
    }
    const installedMajor = semver.major(installedVersion)
    const requiredMajor = semver.major(semver.coerce(version))
    if (installedMajor < requiredMajor) {
      errors.push(`Installed version of ${name} (${installedVersion}) is below the required version (${version})`)
    } else if (installedMajor > requiredMajor) {
      warnings.push(`Installed version of ${name} (${installedVersion}) is newer than the tested version (${version}). This may work but is not officially supported.`)
    }
  }))

  if (warnings.length) {
    warnings.forEach(w => console.log(`WARNING: ${w}`))
    console.log('')
  }
  if (errors.length) {
    const msg = errors.reduce((m, e) => `${m}- ${e}\n`, 'Prerequisite check failed:\n')
    if (options.ignorePrereqs) {
      console.log(msg)
      console.log('WARNING: --ignore-prereqs flag passed so process will continue')
      console.log('WARNING: If issues are encountered please make sure the correct prerequisites are installed\n')
      return
    }
    console.log('HINT: You can pass the --ignore-prereqs flag to skip this check\n')
    throw new Error(msg)
  }
}
