import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { getInstallState, saveInstallState, clearInstallState } from '../lib/utils/installState.js'

describe('installState', () => {
  let tmpDir

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'install-state-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('#getInstallState()', () => {
    it('should return null when no state file exists', async () => {
      assert.equal(await getInstallState(tmpDir), null)
    })

    it('should return parsed state when file exists', async () => {
      await fs.writeFile(path.join(tmpDir, '.install-state.json'), JSON.stringify({ step: 4, selectedRelease: 'v1.0.0' }))
      const state = await getInstallState(tmpDir)
      assert.equal(state.step, 4)
      assert.equal(state.selectedRelease, 'v1.0.0')
    })
  })

  describe('#saveInstallState()', () => {
    it('should create the state file in the root directory', async () => {
      await saveInstallState(tmpDir, { step: 3, selectedRelease: 'v2.0.0' })
      const state = JSON.parse(await fs.readFile(path.join(tmpDir, '.install-state.json'), 'utf8'))
      assert.equal(state.step, 3)
      assert.equal(state.selectedRelease, 'v2.0.0')
      assert.ok(state.timestamp)
    })

    it('should overwrite existing state', async () => {
      await saveInstallState(tmpDir, { step: 2 })
      await saveInstallState(tmpDir, { step: 5 })
      const state = await getInstallState(tmpDir)
      assert.equal(state.step, 5)
    })
  })

  describe('#clearInstallState()', () => {
    it('should remove the state file', async () => {
      await saveInstallState(tmpDir, { step: 4 })
      await clearInstallState(tmpDir)
      assert.equal(await getInstallState(tmpDir), null)
    })

    it('should not throw when no state file exists', async () => {
      await assert.doesNotReject(() => clearInstallState(tmpDir))
    })
  })
})
