import CliCommand from '../lib/CliCommand.js';
import fs from 'fs/promises';
import path from 'path';
import Utils from '../lib/Utils.js';
export default class Install extends CliCommand {
  get config() {
    return {
      ...super.config,
      description: `Lists the app's dependencies`,
      params: { destination: 'The destination to check' }
    };
  }
  async runTask() {
    const deps = { adapt: {}, main: {}, dev: {} };
    const adaptDeps = await this.getAdaptDepsRecursive(path.join(path.resolve(this.options.cwd), 'node_modules'));
    await Promise.all(adaptDeps.map(async d => {
      const { name, version, dependencies, devDependencies } = await JSON.parse(await fs.readFile(path.join(d, 'package.json')));
      deps.adapt[name] = version;
      ;[[dependencies, deps.main], [devDependencies, deps.dev]].forEach(([deps = {}, memo]) => {
        Object.entries(deps).forEach(([k, v]) => {
          if(!memo[k]) memo[k] = [];
          if(!memo[k].includes(v)) memo[k].push(v);
          memo[k] = memo[k].sort();
        });
      });
    }));
    this.processDeps(deps);  
    const adaptKeys = Object.keys(deps.adapt);
    Object.keys(deps.main).forEach(k => {
      if(adaptKeys.includes(k)) delete deps.main[k];
    });
    console.log(deps);
  }
  async getAdaptDepsRecursive(dir, dirs = []) {
    const metaFilename = 'adapt-authoring.json';
    const contents = await fs.readdir(dir);
    await Promise.all(contents.map(async c => {
      const fullPath = path.resolve(dir, c);
      if((await fs.stat(fullPath)).isDirectory()) return this.getAdaptDepsRecursive(fullPath, dirs);
      if(fullPath.endsWith(metaFilename)) dirs.push(path.dirname(fullPath));
    }));
    return dirs;
  };
  
  processDeps(deps) {
    Object.entries(deps).forEach(([k, v]) => {
      const sorted = {};
      Object.keys(v).sort().forEach(d => {
        let versions = v[d];
        if(v[d].length === 1) versions = v[d][0];
        sorted[d] = versions;
      });
      deps[k] = sorted;
    });
  }
}