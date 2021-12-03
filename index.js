#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');
const { Command, program } = require('commander');
const Utils = require('./lib/Utils');

async function parseScripts() {
  const scriptsDir = `${__dirname}/bin`;

  return Promise.all((await fs.readdir(scriptsDir)).map(async f => {
    const { action, description, options = [], params = {} } = require(`${scriptsDir}/${f}`);
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
    const { repository, version } = require(`${__dirname}/package.json`);
    const repoName = repository.replace('github:', '');
    console.log(`\nRunning ${repoName}@${version}\n`);
    
    process.env.NODE_ENV = 'production';
    // allow node to look for deps in the cwd to allow running using npx
    await Utils.addModulePath(process.cwd());
    
    await parseScripts();
    
    program
      .name(`npx ${repoName}`)
      .parse();
  } catch(e) {
    console.log(e);
  }
}
 
module.exports = run();