import { pipeline } from 'stream/promises'
import { createGunzip } from 'zlib'
import fs from 'fs/promises'
import { Unpack } from 'tar'
import exec from './exec.js'
import githubHeaders from './githubHeaders.js'

const DEFAULT_REPO = 'adapt-security/adapt-authoring'

export default async function downloadRelease ({ tag, targetDir, repo = DEFAULT_REPO, cleanInstall = true }) {
  await fs.mkdir(targetDir, { recursive: true })

  console.log(`Downloading ${repo}@${tag}`)
  const response = await fetch(`https://api.github.com/repos/${repo}/tarball/${tag}`, { headers: githubHeaders() })
  if (!response.ok) {
    throw new Error(`Failed to download release ${tag}: ${response.status} ${response.statusText}`)
  }
  console.log('Extracting')
  await pipeline(
    response.body,
    createGunzip(),
    new Unpack({ cwd: targetDir, strip: 1 })
  )
  console.log('Installing npm dependencies')
  await exec(`npm ${cleanInstall ? 'ci' : 'install'}`, targetDir)
}
