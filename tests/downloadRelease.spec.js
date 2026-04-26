import { describe, it, before, after, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { Readable } from 'stream'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { create } from 'tar'

// mock exec before importing downloadRelease
mock.module('../lib/utils/exec.js', {
  defaultExport: async () => {}
})

const { default: downloadRelease } = await import('../lib/utils/downloadRelease.js')

describe('downloadRelease', () => {
  let tmpDir, originalFetch, tarballBuffer

  before(async () => {
    originalFetch = globalThis.fetch

    // create a small tarball in memory with a top-level directory (like GitHub produces)
    const srcDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aat-tar-src-'))
    const innerDir = path.join(srcDir, 'adapt-security-adapt-authoring-abc1234')
    await fs.mkdir(innerDir, { recursive: true })
    await fs.writeFile(path.join(innerDir, 'package.json'), '{"name":"test"}')
    await fs.writeFile(path.join(innerDir, 'index.js'), 'console.log("hello")')

    const chunks = []
    const pack = create({ cwd: srcDir, gzip: false }, ['adapt-security-adapt-authoring-abc1234'])
    const gzip = createGzip()
    const collect = new (await import('stream')).Writable({
      write (chunk, enc, cb) { chunks.push(chunk); cb() }
    })
    await pipeline(pack, gzip, collect)
    tarballBuffer = Buffer.concat(chunks)

    await fs.rm(srcDir, { recursive: true, force: true })
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aat-dl-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('should extract tarball contents to targetDir', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      body: Readable.from(tarballBuffer)
    })
    const targetDir = path.join(tmpDir, 'app')
    await downloadRelease({ tag: 'v1.0.0', targetDir })

    const pkg = JSON.parse(await fs.readFile(path.join(targetDir, 'package.json'), 'utf8'))
    assert.equal(pkg.name, 'test')
    const index = await fs.readFile(path.join(targetDir, 'index.js'), 'utf8')
    assert.equal(index, 'console.log("hello")')
  })

  it('should strip the top-level directory from the tarball', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      body: Readable.from(tarballBuffer)
    })
    const targetDir = path.join(tmpDir, 'app')
    await downloadRelease({ tag: 'v1.0.0', targetDir })

    // should not have the nested github directory
    const files = await fs.readdir(targetDir)
    assert.ok(!files.includes('adapt-security-adapt-authoring-abc1234'))
    assert.ok(files.includes('package.json'))
  })

  it('should throw on non-ok response', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })
    const targetDir = path.join(tmpDir, 'app')
    await assert.rejects(
      downloadRelease({ tag: 'v1.0.0', targetDir }),
      e => {
        assert.match(e.message, /Failed to download/)
        assert.match(e.message, /404/)
        return true
      }
    )
  })

  it('should create the targetDir if it does not exist', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      body: Readable.from(tarballBuffer)
    })
    const targetDir = path.join(tmpDir, 'nested', 'deep', 'app')
    await downloadRelease({ tag: 'v1.0.0', targetDir })
    const stat = await fs.stat(targetDir)
    assert.ok(stat.isDirectory())
  })
})
