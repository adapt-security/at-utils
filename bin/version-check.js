import SimpleCliCommand from '../lib/SimpleCliCommand.js'
import { compareVersions } from '../lib/versionCompare.js'

export default class VersionCheck extends SimpleCliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Compares dependency versions between the last git tag and now, and recommends a semver bump',
      params: {},
      options: [
        ['--cwd <path>', 'Path to the git repository', process.cwd()],
        ['--json', 'Output results as JSON']
      ],
      getReleaseData: false
    }
  }

  async runTask () {
    const cwd = this.options.cwd || process.cwd()

    let result
    try {
      result = compareVersions(cwd)
    } catch (e) {
      console.error(e.message)
      process.exitCode = 1
      return
    }

    const { tag, currentVersion, changes, highestBump, recommendedVersion } = result

    if (changes.length === 0) {
      if (this.options.json) {
        console.log(JSON.stringify({ tag, currentVersion, changes: [], highestBump: null, recommendedVersion: null }))
      } else {
        console.log(`Comparing against tag: ${tag}\n`)
        console.log('No dependency changes detected.')
      }
      return
    }

    if (this.options.json) {
      console.log(JSON.stringify({ tag, currentVersion, changes, highestBump, recommendedVersion }))
      return
    }

    console.log(`Comparing against tag: ${tag}\n`)
    console.log('Changed dependencies:\n')

    const nameWidth = Math.max(...changes.map(c => c.name.length))
    const oldWidth = Math.max(...changes.map(c => (c.oldVer || '(new)').length))
    const newWidth = Math.max(...changes.map(c => (c.newVer || '(removed)').length))

    for (const c of changes) {
      const old = (c.oldVer || '(new)').padStart(oldWidth)
      const nw = (c.newVer || '(removed)').padEnd(newWidth)
      console.log(`  ${c.name.padEnd(nameWidth)}  ${old}  -> ${nw}  ${c.bump}`)
    }

    console.log(`\nHighest bump: ${highestBump}`)
    console.log(`Current version: ${currentVersion}`)
    console.log(`Recommended version: ${recommendedVersion}`)
  }
}
