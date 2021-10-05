/* eslint no-console: 0 */
const { exec } = require('child_process');
const fs = require('fs/promises');
const path = require('path');

const localModulesDir = path.resolve(process.argv[2]);

if(!localModulesDir) {
  console.log('adapt-authoring-core.localModulesDir must be set to use local modules');
  process.exit();
}
getDeps(path.resolve(process.cwd(), 'node_modules')).then(async d => {
  try {
    await globalLink(d);
    await localLink(d);
    console.log(`Successfully linked '${d}'`);
  } catch {}
});

function globalLink(name) {
  return new Promise((resolve, reject) => {
    exec('npm link', { cwd: path.resolve(`${localModulesDir}/${name}`) })
      .on('error', reject)
      .on('exit', resolve);
  });
}

function localLink(name) {
  return new Promise((resolve, reject) => {
    exec(`npm link ${name}`)
      .on('error', reject)
      .on('exit', resolve);
  });
}

async function getDeps(dir) {
  console.log(dir);
  const deps = new Set();
  await Promise.all((await fs.readdir(dir)).map(async c => {
    try {
      await fs.readFile(path.join(dir, c, 'adapt-authoring.json'));
      deps.add(c);
      const nodeModsDir = path.join(dir, c, 'node_modules');
      if(await fs.stat(nodeModsDir)) {
        const nestedDeps = await getDeps(nodeModsDir);
        nestedDeps.forEach(d => deps.add(d));
      }
    } catch(e) {} // not an authoring module
  }));
  return deps;
}