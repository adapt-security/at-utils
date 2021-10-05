#!/usr/bin/env node
const fs = require('fs/promises');
const { parse } = require('comment-parser');
const path = require('path');
const { Command, program } = require('commander');
const Utils = require('./lib/Utils');

async function parseScripts() {
  const scriptsDir = `${__dirname}/bin`;

  return Promise.all((await fs.readdir(scriptsDir)).map(async f => {
    const scriptPath = `${scriptsDir}/${f}`;
    const match = (await fs.readFile(scriptPath)).toString().match(/^\/\*\*([\s\S]+?)\*\//);
    let description = '';
    let params = [];
    if(match) {
      const data = parse(match[0])[0];
      params = data.tags.filter(t => t.tag === 'param');
      description = data.description;
      if(params.length) data.params = params;
    }
    const c = new Command(path.basename(f, path.extname(f)));
    c.description(description || '')
    c.option('-p, --prerelease', 'Whether to include prereleases THIS COULD BE DANGEROUS')
    c.option('-t, --tag [git-tag]', 'A specific git tag to use')
    c.option('--no-ui', 'Run in CLI-only mode')
    c.action((...args) => {
      require(scriptPath)(...args)
        .catch(e => console.log(`Command '${c.name()}' failed with error:\n\n${e}`));
    });
    
    params.forEach(p => c.argument(wrapParam(p), p.description));

    program.addCommand(c);
  }));
}

function wrapParam({ name, optional }) {
  return `${optional ? '[' : '<'}${name}${optional ? ']' : '>'}`;
}

async function run() {
  process.env.NODE_ENV = 'production';
  // allow node to look for deps in the cwd to allow running using npx
  Utils.addModulePath(`${process.cwd()}/node_modules`);
  
  await parseScripts();

  const scriptName = require('./package.json').repository.url.match(/github.com\/(.+\/.+)\.git/)[1];
  
  program
    .name(`npx ${scriptName}`)
    .parse();
}
 
module.exports = run();