import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import getInstalledVersion, { writeInstalledVersion } from '../lib/utils/getInstalledVersion.js'

describe('getInstalledVersion', () => {
  let tmpDir

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aat-test-'))
    await fs.mkdir(path.join(tmpDir, 'conf'), { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('should return null when no version file exists', async () => {
    const version = await getInstalledVersion(tmpDir)
    assert.equal(version, null)
  })

  it('should return the version string when file exists', async () => {
    await fs.writeFile(path.join(tmpDir, 'conf', '.version'), 'v1.2.3')
    const version = await getInstalledVersion(tmpDir)
    assert.equal(version, 'v1.2.3')
  })

  it('should trim whitespace from version string', async () => {
    await fs.writeFile(path.join(tmpDir, 'conf', '.version'), '  v1.2.3\n')
    const version = await getInstalledVersion(tmpDir)
    assert.equal(version, 'v1.2.3')
  })
})

describe('writeInstalledVersion', () => {
  let tmpDir

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aat-test-'))
    await fs.mkdir(path.join(tmpDir, 'conf'), { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('should write the version file', async () => {
    await writeInstalledVersion(tmpDir, 'v2.0.0')
    const content = await fs.readFile(path.join(tmpDir, 'conf', '.version'), 'utf8')
    assert.equal(content, 'v2.0.0')
  })

  it('should overwrite an existing version file', async () => {
    await writeInstalledVersion(tmpDir, 'v1.0.0')
    await writeInstalledVersion(tmpDir, 'v2.0.0')
    const content = await fs.readFile(path.join(tmpDir, 'conf', '.version'), 'utf8')
    assert.equal(content, 'v2.0.0')
  })
})
