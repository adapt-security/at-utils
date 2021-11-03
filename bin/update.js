/**
 * Updates the application in destination drectory
 * @param {String} [destination]
 */
const prompts = require('prompts');
const semver = require('semver');
const UiServer = require('../lib/UiServer');
const Utils = require('../lib/Utils');

async function run(destination, _, command) {
  try {
    await doUpdate(destination, command);
    console.log(`Application updated successfully.`);
  } catch(e) {
    console.log(`Update failed, ${e}`);
  }
  process.exit();
}

async function doUpdate(destination, command) {
  const { ui, prerelease } = command.opts();
  const dest = destination || process.cwd();
  // add dest to make sure modules are imported
  Utils.addModulePath(`${dest}/node_modules`);
  if(ui) {
    return new UiServer(dest, command.name());
  }
  console.log(`Updating Adapt authoring tool in ${dest}`);
  let currentVersion;
  try {
    currentVersion = require(`${dest}/package.json`).version;
  } catch(e) {
    throw new Error(`Couldn't determine current version`);
  }
  const [{ name }] = await Utils.getReleases(prerelease);

  if(!semver.gt(name, currentVersion)) {
    return console.log(`You are already using the latest version (${currentVersion}). Nothing to do`);
  }
  console.log(`A newer version is available (${name})`);
  
  const { confirmed } = await prompts([{
    type: 'confirm',
    name: 'confirmed',
    message: 'Do you want to update'
  }]);
  if(!confirmed) {
    return;
  }
  await Utils.updateRepo(name, dest);
}
 
module.exports = run;