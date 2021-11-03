/**
 * Installs the application into destination directory
 * @param {String} [destination]
 */
const fs = require('fs/promises');
const path = require('path');
const UiServer = require('../lib/UiServer');
const Utils = require('../lib/Utils');

async function run(destination, _, command) {
  const dest = path.resolve(destination || `${process.cwd()}/adapt-authoring`);
  const { prerelease, tag, ui } = command.opts();
  if(ui) {
    return new UiServer(dest, command.name())
      .on('error', cleanUp);
  }
  try {
    await doCLIInstall(dest, tag, prerelease);
  } catch(e) {
    cleanUp(e);
  }
}

async function cleanUp(error) {
  if(error) {
    console.log(e);
    fs.rm(dest, { recursive: true, force: true }).catch(console.log);
  } else {
    const { App } = require('adapt-authoring-core');
    console.log(`\nApplication installed successfully. To start the app, please run the following commands:\n\ncd ${App.instance.rootDir}\nnpm start\n`);
    process.exit();
  }
  process.exit();
}

async function doCLIInstall(dest, tag, prerelease) {
  try {
    await Utils.checkPrerequisites();
  } catch(e) {
    console.log(`\n${e.errors.map(e2 => e2.message).join('\n')}\n`);
    throw e;
  }
  let name = tag;
  if(!name) {
    const [r] = await Utils.getReleases(prerelease);
    name = r.name;
    if(r.prerelease) await doPrereleaseCounter();
  }
  console.log(`Installing Adapt authoring tool ${name} in ${dest}`);
  
  const configPath = path.resolve(dest, 'conf', `${process.env.NODE_ENV}.config.js`);
  let configContents;
  try {
    configContents = await fs.readFile(configPath);
  } catch(e) {
    throw e.code === 'ENOENT' ? new Error(`Expected config file at '${configPath}'`) : e;
  }
  // remove config because git clone won't work
  await fs.rm(path.dirname(configPath), { recursive: true });
  await Utils.cloneRepo(name, dest);
  // reinstate config
  await fs.mkdir(path.dirname(configPath));
  await fs.writeFile(configPath, configContents);
  // add new clone dest to make sure modules are imported
  Utils.addModulePath(`${dest}/node_modules`);
  await Utils.startApp();
  await Utils.registerSuperUserCmd();
}

async function doPrereleaseCounter() {
  return new Promise((resolve, reject) => {
    console.log('\nWARNING! THIS IS A PRERELEASE AND NOT SUITABLE FOR PRODUCTION. PLEASE PROCEED WITH CAUTION.\n');
    console.log('If this was done in error, please exit the script now using Ctrl+C\n');
    const msg = 'Continuing install in ';
    let countdown = 8;
    let i = 2;
    process.stdout.write(msg);
    const int = setInterval(() => {
      if(i !== 2) {
        process.stdout.write('.');
        i++;
        return;
      }
      i = 0;
      process.stdout.cursorTo(msg.length);
      process.stdout.write(countdown.toString());
      countdown--;
      if(countdown > 0) {
        return;
      }
      clearInterval(int);
      process.stdout.write('\n');
      resolve();
    }, 1000/2);
  });
}
 
module.exports = run;