import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

export default class Install {
  async run() {
    const defaultOptions = await import(pathToFileURL(path.resolve(this.config.srcDir, '../../lib/DEFAULT_OPTIONS.js')));
    console.log(defaultOptions);
    const scriptData = await this.loadScriptData();
    this.manualFile = 'at-utils.md';
    this.contents = scriptData.map(s => s.name);
    this.replace = { CONTENTS: await this.generateMd(scriptData) };
  }
  async loadScriptData() {
    const scriptRoot = path.resolve(this.config.srcDir, '../../bin');
    const files = await fs.readdir(scriptRoot);
    return Promise.all((files.map(async f => {
      const ScriptClass = (await import(pathToFileURL(path.join(scriptRoot, f)))).default;
      const s = new ScriptClass();
      return { 
        name:  f.replace('.js', ''),
        description: s.config.description,
        input: [
          ['Options', s.config.options],
          ['Arguments', Object.entries(s.config.params)]
        ]
      };
    })));
  }
  async generateMd(scriptData) {
    return scriptData.reduce((md, data) => {
      md += this.headerMd(data);
      md += data.input.reduce((m, dataArr) => m + this.optionMd(dataArr), '');
      md += '\n***\n\n';
      return md;
    }, '');
  }
  headerMd(data) {
    return `## \`${data.name}\`\n\n${data.description}\n\n`;
  }
  optionMd([name, data]) {
    if(!data.length) return '';
    return `#### ${name}\n\n${data.map(([name, desc]) => `- \`${name}\`: ${desc}`).join('\n')}\n\n`;
  }
}