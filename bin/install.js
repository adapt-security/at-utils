import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import UiServer from '../lib/UiServer.js';
import Utils from '../lib/Utils.js';

let dest;
let configContents;

async function run(destination, opts, command) {
  dest = path.resolve(destination || `${process.cwd()}/adapt-authoring`);
  const { branches, prerelease, tag, ui } = opts;
  if(ui) {
    return new UiServer({ 
      cwd: dest, 
      action: command.name(), 
      includeBranches: branches,
      includePrereleases: prerelease
    })
      .on('exit', cleanUp);
  }
  try {
    await doCLIInstall(tag, prerelease, branches);
    cleanUp();
  } catch(e) {
    cleanUp(e);
  }
}

async function cleanUp(error) {
  if(error) {
    console.trace(error);
    try { // for obvious reasons don't remove dest if git clone threw EEXIST
      if(error.code !== 'GITCLONEEEXIST') {
        await fs.rm(dest, { recursive: true, force: true });
        // reinstate the config file
        if(configContents) await Utils.saveConfig(dest, configContents);
      }
    } catch(e) {
      console.trace(e);
    }
  } else {
    const { App } = await Utils.importCore(dest);
    console.log(`\nApplication installed successfully. To start the app, please run the following commands:\n\ncd ${App.instance.rootDir}\nnpm start\n`);
    process.exit();
  }
  process.exit();
}

async function doCLIInstall(tag, includePrereleases, includeBranches) {
  try {
    await Utils.checkPrerequisites();
  } catch(e) {
    console.log(`\n${e.errors.map(e2 => e2.message).join('\n')}\n`);
    throw e;
  }
  let name = tag;
  if(!name) {
    const [r] = await Utils.getReleases({ includePrereleases, includeBranches });
    name = r.name.replace('branch:', '');
    if(r.prerelease) await doPrereleaseCounter();
  }
  console.log(`Installing Adapt authoring tool ${name} in ${dest}`);
  
  const configPath = path.resolve(dest, 'conf', `${process.env.NODE_ENV}.config.js`);
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
  // create super admin
  await Utils.startApp(dest);
  await Utils.registerSuperUserCmd(dest);
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
      readline.cursorTo(process.stdout, msg.length);
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
 
export default {
  action: run,
  description: 'Installs the application into destination directory',
  params: { destination: 'The destination folder for the install' }
};