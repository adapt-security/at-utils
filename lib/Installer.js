import downloadRelease from './utils/downloadRelease.js'
import getInstalledVersion, { writeInstalledVersion } from './utils/getInstalledVersion.js'
import swapInstall from './utils/swapInstall.js'

export default class Installer {
  constructor (options) {
    this.options = options
  }

  get stagingDir () {
    return `${this.options.cwd}.aat-staging-${Date.now()}`
  }

  async getInstalledVersion () {
    return getInstalledVersion(this.options.cwd)
  }

  async install () {
    await writeInstalledVersion(this.options.cwd, this.options.tag)
    await downloadRelease({ tag: this.options.tag, targetDir: this.options.cwd })
  }

  async update () {
    const currentVersion = await this.getInstalledVersion()
    if (!currentVersion) {
      throw new Error(`No existing install found in ${this.options.cwd}`)
    }
    const stagingDir = this.stagingDir
    await downloadRelease({ tag: this.options.tag, targetDir: stagingDir })
    await swapInstall({ stagingDir, targetDir: this.options.cwd, version: currentVersion })
    await writeInstalledVersion(this.options.cwd, this.options.tag)
  }
}
