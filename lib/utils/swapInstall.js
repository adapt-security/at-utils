import fs from 'fs/promises'
import path from 'path'

export default async function swapInstall ({ stagingDir, targetDir, version }) {
  const confDir = path.join(targetDir, 'conf')
  const stagingConfDir = path.join(stagingDir, 'conf')

  // copy conf/ from current install into staging
  await fs.cp(confDir, stagingConfDir, { recursive: true })

  // rename current to backup, staging to target
  const backupDir = `${targetDir}.backup-${version}`
  await fs.rename(targetDir, backupDir)
  await fs.rename(stagingDir, targetDir)

  // clean up backup
  await fs.rm(backupDir, { recursive: true, force: true })
}
