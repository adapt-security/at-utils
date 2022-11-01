#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { Command, program } from 'commander';
import Utils from './lib/Utils.js';
import CliCommand from './lib/CliCommand.js';

const scriptsDir = new URL('bin', import.meta.url);

async function parseScripts() {

  return Promise.all((await fs.readdir(scriptsDir)).map(async f => {
    let localCommand = await loadCommand(f);
    if(!localCommand) return;
    const options = [
      ...localCommand.config.options,
      // assign default options
      ['--branches', 'Whether to include git branches THIS COULD BE DANGEROUS'],
      ['--dev', 'Developer installation NOT FOR PRODUCTION'],
      ['--drafts', 'Whether to include draft releases THIS COULD BE DANGEROUS'],
      ['--prerelease', 'Whether to include prereleases THIS COULD BE DANGEROUS'],
      ['--no-ui', 'Run in CLI-only mode'],
      ['--tag <tag>', 'A specific git tag to use'],
    ];
    const c = new Command(path.basename(f, path.extname(f)));
    
    c.description(localCommand.config.description || '');
    
    options.forEach(args => c.option(...args));
    Object.entries(localCommand.config.params).forEach(([p, desc]) => c.argument(wrapParam(p), desc));
    
    c.action((...args) => localCommand.run(...args).catch(e => console.log(`Command '${c.name()}' failed with error:\n\n${e}`)));
    
    program.addCommand(c);
  }));
}

async function loadCommand(filename) {
  try {
    const defaultExport = (await import(`${scriptsDir}/${filename}`)).default;
    if(!defaultExport) throw new Error('File does not have a default export');
    if(typeof defaultExport !== 'function') throw new Error('File does not export a class');
    const cmd = new defaultExport;
    if(!cmd instanceof CliCommand) throw new Error('Command does not extend CliCommand');
    return cmd;
  } catch(e) {
    console.log(`Error loading ${filename}, ${e.message}`);
  }
}

function wrapParam(p) {
  let { name = p, optional = false } = p;
  return `${optional ? '[' : '<'}${name}${optional ? ']' : '>'}`;
}

async function run() {
  try {
    const { repository, version } = await Utils.loadPackage(import.meta.url);
    const repoName = repository.toString().replace('github:', '');
    console.log(`\nRunning ${repoName}@${version}\n`);

    process.env.NODE_ENV = 'production';
    
    await parseScripts();
    
    program
      .name(`npx ${repoName}`)
      .parse();
  } catch(e) {
    console.log(e);
  }
}
 
export default run();
