import exec from './exec.js'
import githubRequest from './githubRequest.js'
import semver from 'semver'
import { normalizeBump } from '../versionCompare.js'

export default async function getReleases (options) {
  let currentVersionDate
  try {
    currentVersionDate = new Date(await exec('git log -1 --format=%cd', options.cwd))
  } catch (e) {}
  const releases = (await githubRequest('releases?per_page=10'))

  if (options.includeBranches) {
    await Promise.all((await githubRequest('branches')).map(async b => {
      const { commit } = await githubRequest(b.commit.url.slice(b.commit.url.indexOf('commits/')))
      releases.push({
        name: `${b.name} (branch)`,
        tag_name: b.name,
        published_at: commit.author.date,
        branch: true
      })
    }))
  }
  return releases
    .map(r => {
      const diff = (semver.valid(options.currentVersion) && semver.valid(r.tag_name))
        ? semver.diff(options.currentVersion, r.tag_name)
        : null
      const bump = diff ? normalizeBump(diff) : null
      return Object.assign(r, {
        bump,
        name: `${r.name}${r.draft ? ' (draft)' : r.prerelease ? ' (prerelease)' : ''}`,
        date: new Date(r.published_at)
      })
    })
    .filter(r => {
      if ((r.tag_name === options.currentVersion) || (r.prerelease && !options.includePrereleases) || (r.draft && !options.includeDrafts)) {
        return false
      }
      const noCurrent = !options.currentVersion
      const semverNewer = (semver.valid(options.currentVersion) && semver.valid(r.tag_name) && semver.gt(r.tag_name, options.currentVersion)) ?? false
      const gitNewer = r.date > currentVersionDate
      return noCurrent || semverNewer || gitNewer
    })
    .filter(r => {
      if (options.patchOnly && r.bump !== null && r.bump !== 'patch') return false
      if (options.minorOnly && r.bump !== null && r.bump === 'major') return false
      return true
    })
    .sort((a, b) => a.date < b.date ? 1 : -1)
}
