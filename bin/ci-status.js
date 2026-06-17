import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import CliCommand from '../lib/CliCommand.js'
import githubRequest from '../lib/utils/githubRequest.js'
import loadJson from '../lib/utils/loadJson.js'
import parseRepoSlug from '../lib/utils/parseRepoSlug.js'
import aggregateCiState from '../lib/utils/aggregateCiState.js'
import ciStatusEmoji from '../lib/utils/ciStatusEmoji.js'
import renderCiStatusTable from '../lib/utils/renderCiStatusTable.js'
import spliceReadmeSection from '../lib/utils/spliceReadmeSection.js'

export default class CiStatus extends CliCommand {
  get config () {
    return {
      ...super.config,
      description: "Reports the latest CI run on each dependency repo's default branch",
      params: {},
      options: [
        ['--json', 'Output results as JSON'],
        ['--update-readme', 'Splice the status table into README.md between the ci-status markers']
      ],
      getReleaseData: false
    }
  }

  async runTask () {
    const cwd = this.options.cwd || process.cwd()

    let repos
    try {
      repos = await loadJson(join(cwd, 'bin', 'repos.json'))
    } catch (e) {
      console.error(`Could not read bin/repos.json in ${cwd}. Run this from the umbrella repository root.`)
      process.exitCode = 1
      return
    }

    const rows = await Promise.all(repos.map(repo => this.checkRepo(repo)))
    rows.sort((a, b) => a.repo < b.repo ? -1 : 1)

    if (this.options.updateReadme) {
      await this.updateReadme(cwd, rows)
      return
    }

    if (this.options.json) {
      console.log(JSON.stringify(rows, null, 2))
    } else {
      this.printTable(rows)
    }

    // A non-zero exit lets the command double as a CI gate; the dashboard
    // (--update-readme) always succeeds so red dependencies still get published.
    if (rows.some(row => row.state !== 'pass')) process.exitCode = 1
  }

  async checkRepo (entry) {
    const repo = parseRepoSlug(entry.url)
    const actionsUrl = `https://github.com/${repo}/actions`
    try {
      const { default_branch: branch } = await githubRequest('', { repo })
      const { workflow_runs: runs } = await githubRequest(
        `actions/runs?branch=${encodeURIComponent(branch)}&per_page=30`, { repo }
      )
      const { state, url } = aggregateCiState(runs)
      return { name: entry.name, repo, branch, state, url: url || actionsUrl }
    } catch (e) {
      return { name: entry.name, repo, branch: null, state: 'error', url: actionsUrl }
    }
  }

  printTable (rows) {
    const width = Math.max(...rows.map(row => row.name.length))
    rows.forEach(row => console.log(`${ciStatusEmoji(row.state)} ${row.name.padEnd(width)}  ${row.state}`))

    const failing = rows.filter(row => row.state !== 'pass')
    console.log(`\n${rows.length - failing.length}/${rows.length} passing.`)
    if (failing.length) console.log(`Not passing: ${failing.map(row => row.name).join(', ')}`)
  }

  async updateReadme (cwd, rows) {
    const updated = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
    const readmePath = join(cwd, 'README.md')
    const content = await readFile(readmePath, 'utf8')
    await writeFile(readmePath, spliceReadmeSection(content, renderCiStatusTable(rows, updated)))
    console.log(`Updated ${readmePath}`)
  }
}
