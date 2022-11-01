import fs from 'fs';

export default class Install {
  constructor(app, config) {
    this.outputPath = `${config.outputDir}/install.md`;
  }
  async run() {
    const { prerequisites } = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)).toString());
    let file = fs.readFileSync(new URL('install.md', import.meta.url)).toString();
    let commandsMd = '';

    Object.entries(prerequisites).forEach(([name, version]) => {
      file = file.replaceAll(`{{{${name}}}}`, version);
      commandsMd += `\`\`\`\n${name} --version\n\`\`\`\n`;
    });
    file = file.replace(`{{{commands}}}`, commandsMd);

    fs.writeFileSync(this.outputPath, file);
    this.customFiles = [this.outputPath];
  }
}