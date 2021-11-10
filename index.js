#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');
const { Command, program } = require('commander');
const Utils = require('./lib/Utils');

async function parseScripts() {
  const scriptsDir = `${__dirname}/bin`;

  return Promise.all((await fs.readdir(scriptsDir)).map(async f => {
    const { action, description, options = {}, params = {} } = require(`${scriptsDir}/${f}`);
    // assign default options
    Object.assign(options, {
      prerelease: 'Whether to include prereleases THIS COULD BE DANGEROUS',
      'no-ui': 'Run in CLI-only mode',
      tag: 'A specific git tag to use',
    });
    const c = new Command(path.basename(f, path.extname(f)));
    
    c.description(description || '')
    
    Object.entries(options).forEach(([o, desc]) => c.option(`--${o}`, desc));
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
  process.env.NODE_ENV = 'production';
  // allow node to look for deps in the cwd to allow running using npx
  await Utils.addModulePath(process.cwd());
  
  await parseScripts();

  const scriptName = require('./package.json').repository.url.match(/github.com\/(.+\/.+)\.git/)[1];
  
  program
    .name(`npx ${scriptName}`)
    .parse();
}
 
module.exports = run();