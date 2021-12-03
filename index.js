#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { Command, program } from 'commander';
import Utils from './lib/Utils.js';

async function parseScripts() {
  const scriptsDir = path.resolve(new URL(import.meta.url).pathname, '../bin');

  return Promise.all((await fs.readdir(scriptsDir)).map(async f => {
    const { action, description, options = [], params = {} } = (await import(`${scriptsDir}/${f}`)).default;
    // assign default options
    options.push(
      ['-b, --branches', 'Whether to include git branches THIS COULD BE DANGEROUS'],
      ['-p, --prerelease', 'Whether to include prereleases THIS COULD BE DANGEROUS'],
      ['--no-ui', 'Run in CLI-only mode'],
      ['--tag <tag>', 'A specific git tag to use'],
    );
    Object.assign(options, {
    });
    const c = new Command(path.basename(f, path.extname(f)));
    
    c.description(description || '')
    
    options.forEach(args => c.option(...args));
    Object.entries(params).forEach(([p, desc]) => c.argument(wrapParam(p), desc));
    
    c.action((...args) => action(...args).catch(e => console.log(`Command '${c.name()}' failed with error:\n\n${e}`)));
    
    program.addCommand(c);
  }));
}

function wrapParam(p) {
  let { name = p, optional = false } = p;
  return `${optional ? '[' : '<'}${name}${optional ? ']' : '>'}`;
}

async function run() {
  try {
    const { repository, version } = await Utils.loadPackage(import.meta.url);
    const repoName = repository.replace('github:', '');
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