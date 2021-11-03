/**
 * Updates the application in destination drectory
 * @param {String} [destination]
 */
const prompts = require('prompts');
const semver = require('semver');
const UiServer = require('../lib/UiServer');
const Utils = require('../lib/Utils');

async function run(destination, _, command) {
  const { ui, prerelease } = command.opts();
  const dest = destination || process.cwd();
  // add dest to make sure modules are imported
  Utils.addModulePath(`${dest}/node_modules`);
  if(ui) {
    return new UiServer({ cwd: dest, action: command.name(), includePrereleases: prerelease })
      .on('exit', cleanUp);
  }
  console.log(`Updating Adapt authoring tool in ${dest}`);
  try {
    await doCLIUpdate(dest, prerelease);
  } catch(e) {
    cleanUp(e);
  }
}

async function doCLIUpdate(dest, includePrereleases) {
  let currentVersion;
  try {
    currentVersion = require(`${dest}/package.json`).version;
  } catch(e) {
    throw new Error(`Couldn't determine current version`);
  }
  let defaultVersion;
  const newerVersions = (await Utils.getReleases({ includePrereleases, currentVersion })).map((r,i) => {
    if(semver.satisfies(`^${currentVersion}`, r.tag_name)) defaultVersion = i;
    return { title: r.name, value: r.tag_name };
  });
  if(!newerVersions.length) {
    console.log(`You are already using the latest version (${currentVersion}). Nothing to do`);
    return cleanUp();
  }
  const { tag } = await prompts([{
    type: 'select',
    name: 'tag',
    message: 'Choose a release to update to',
    initial: defaultVersion,
    choices: newerVersions
  }]);
  await Utils.updateRepo(tag, dest);
}

function cleanUp(error) {
  if(error) {
    console.log(`Update failed, ${error}`);
  } else {
    console.log(`Application updated successfully.`);
  }
  process.exit();
}
 
module.exports = run;