import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import semver from 'semver'
import SimpleCliCommand from '../lib/SimpleCliCommand.js'
import { compareVersions } from '../lib/versionCompare.js'

export default class ReleaseNotes extends SimpleCliCommand {
  get config () {
    return {
      ...super.config,
      description: 'Fetches GitHub release notes for all changed dependencies since the last git tag',
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

    const { tag, recommendedVersion, changes } = result

    if (changes.length === 0) {
      console.log('No dependency changes detected.')
      return
    }

    if (this.options.json) {
      const deps = []
      for (const change of changes) {
        if (!change.newVer) continue
        const repo = this.getRepo(cwd, change.name)
        if (!repo) {
          console.warn(`Warning: could not resolve repository for ${change.name}, skipping.`)
          continue
        }
        const releases = await this.fetchReleases(repo, change.name)
        if (!releases) continue
        const filtered = this.filterReleases(releases, change.oldVer, change.newVer)
        if (filtered.length === 0) continue
        deps.push({
          name: change.name,
          oldVer: change.oldVer,
          newVer: change.newVer,
          releases: filtered.map(r => ({ tag: r.tag_name, body: r.body || '' }))
        })
      }
      console.log(JSON.stringify({ tag, dependencies: deps }, null, 2))
      return
    }

    const bumpEmoji = { major: '💥', minor: '✨', patch: '🔧' }

    console.log(`## ${recommendedVersion}\n`)
    console.log('The following modules were updated in this release. Please see individual module release notes for specific changes and how they may affect your environment, particularly any breaking changes.\n')

    const skipped = []
    for (const change of changes.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!change.newVer) continue
      const from = change.oldVer || '(new)'
      const emoji = bumpEmoji[change.bump] || ''
      const repo = this.getRepo(cwd, change.name)
      if (!repo) skipped.push(change.name)
      const link = repo ? ` [releases](https://github.com/${repo}/releases)` : ''
      console.log(`* ${emoji} ${change.name} (${from} → ${change.newVer})${link}`)
    }
    if (skipped.length) {
      console.warn(`\nCould not resolve repository for: ${skipped.join(', ')}`)
    }
  }

  getRepo (cwd, name) {
    let pkg
    try {
      pkg = JSON.parse(readFileSync(join(cwd, 'node_modules', name, 'package.json'), 'utf8'))
    } catch {
      return null
    }

    const repo = pkg.repository
    if (!repo) return null

    const repoStr = typeof repo === 'object' ? repo.url : repo
    const match = repoStr.match(/github[.:]([^/]+\/[^/.]+?)(?:\.git)?$/)
    if (match) return match[1]

    const ghMatch = repoStr.match(/^github:(.+)$/)
    if (ghMatch) return ghMatch[1]

    return null
  }

  async fetchReleases (repo, name) {
    const headers = { Accept: 'application/vnd.github+json' }
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    }
    try {
      const releases = []
      let url = `https://api.github.com/repos/${repo}/releases?per_page=100`
      while (url) {
        const res = await fetch(url, { headers })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        releases.push(...await res.json())
        const link = res.headers.get('link') || ''
        const next = link.match(/<([^>]+)>;\s*rel="next"/)
        url = next ? next[1] : null
      }
      return releases
    } catch {
      console.warn(`Warning: could not fetch releases for ${name} (${repo}), skipping.`)
      return null
    }
  }

  filterReleases (releases, oldVer, newVer) {
    return releases
      .filter(r => {
        const v = semver.clean(r.tag_name)
        if (!v) return false
        if (oldVer) {
          return semver.gt(v, oldVer) && semver.lte(v, newVer)
        }
        return semver.lte(v, newVer)
      })
      .sort((a, b) => semver.compare(semver.clean(a.tag_name), semver.clean(b.tag_name)))
  }
}
