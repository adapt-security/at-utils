import fs from 'fs'
import path from 'path'

export default class Install {
  async run () {
    this.manualFile = 'install.md'
    this.prerequisites = JSON.parse(fs.readFileSync(path.resolve(this.config.srcDir, '../../package.json')).toString()).prerequisites
    this.replace = {
      commands: this.generateMd(),
      ...Object.entries(this.prerequisites).reduce((m, [name, version]) => Object.assign(m, { [name]: version }), {})
    }
  }

  generateMd () {
    return Object.entries(this.prerequisites).reduce((s, [name]) => `${s}\`\`\`\n${name} --version\n\`\`\`\n`, '')
  }
}
