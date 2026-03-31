import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import swapInstall from '../lib/utils/swapInstall.js'

describe('swapInstall', () => {
  let tmpDir, targetDir, stagingDir

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aat-test-'))
    targetDir = path.join(tmpDir, 'app')
    stagingDir = path.join(tmpDir, 'staging')

    // create a target install with conf/ and a file
    await fs.mkdir(path.join(targetDir, 'conf'), { recursive: true })
    await fs.writeFile(path.join(targetDir, 'conf', 'production.config.js'), 'export default {}')
    await fs.writeFile(path.join(targetDir, 'index.js'), 'old version')

    // create a staging install with new code
    await fs.mkdir(stagingDir, { recursive: true })
    await fs.writeFile(path.join(stagingDir, 'index.js'), 'new version')
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('should copy conf/ from target into staging', async () => {
    await swapInstall({ stagingDir, targetDir, version: 'v1.0.0' })
    const config = await fs.readFile(path.join(targetDir, 'conf', 'production.config.js'), 'utf8')
    assert.equal(config, 'export default {}')
  })

  it('should replace target with staging contents', async () => {
    await swapInstall({ stagingDir, targetDir, version: 'v1.0.0' })
    const content = await fs.readFile(path.join(targetDir, 'index.js'), 'utf8')
    assert.equal(content, 'new version')
  })

  it('should remove the backup directory', async () => {
    await swapInstall({ stagingDir, targetDir, version: 'v1.0.0' })
    const backupDir = `${targetDir}.backup-v1.0.0`
    await assert.rejects(() => fs.access(backupDir))
  })

  it('should remove the staging directory', async () => {
    await swapInstall({ stagingDir, targetDir, version: 'v1.0.0' })
    await assert.rejects(() => fs.access(stagingDir))
  })

  it('should preserve all files in conf/', async () => {
    await fs.writeFile(path.join(targetDir, 'conf', '.version'), 'v1.0.0')
    await swapInstall({ stagingDir, targetDir, version: 'v1.0.0' })
    const version = await fs.readFile(path.join(targetDir, 'conf', '.version'), 'utf8')
    assert.equal(version, 'v1.0.0')
  })
})
