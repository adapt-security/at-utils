import prompts from 'prompts';
import semver from 'semver';
import UiServer from '../lib/UiServer.js';
import Utils from '../lib/Utils.js';

let dest;
let includeBranches;
let includePrereleases;

async function run(destination, opts, command) {
  dest = destination || process.cwd();
  includeBranches = opts.branches;
  includePrereleases = opts.prerelease;
  if(opts.ui) {
    return new UiServer({ cwd: dest, action: command.name(), includeBranches, includePrereleases })
      .on('exit', cleanUp);
  }
  const releaseData = await getVersions();
  if(!releaseData.latestCompatibleVersion) {
    return console.log(`You are already using the latest version (${releaseData.currentVersion}). Nothing to do`);
  }
  console.log(`You are using ${releaseData.currentVersion}, but ${releaseData.latestCompatibleVersion} is now available!`);
  
  if(opts.check) {
    return;
  }
  console.log(`Updating Adapt authoring tool in ${dest}`);
  try {
    await doCLIUpdate(releaseData);
  } catch(e) {
    cleanUp(e);
  }
}

async function getVersions() {
  const data = {};
  try {
    data.currentVersion = (await Utils.loadPackage(dest)).version;
  } catch(e) {
    throw new Error(`Couldn't determine current version`);
  }
  const releases = await Utils.getReleases({ includeBranches, includePrereleases, currentVersion: data.currentVersion });
  data.newerVersions = releases.map((r,i) => {
    const isCompatible = semver.satisfies(`^${data.currentVersion}`, r.tag_name);
    const isGreater = semver.gt(releases[data.latestCompatibleVersion].tag_name, r.tag_name);
    if(isCompatible && isGreater) data.latestCompatibleVersion = i;
    return { title: r.name, value: r.tag_name };
  });
  return data;
}

async function doCLIUpdate({ currentVersion, latestCompatibleVersion, newerVersions }) {
  const { tag } = await prompts([{
    type: 'select',
    name: 'tag',
    message: 'Choose a release to update to',
    initial: latestCompatibleVersion,
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
 
export default {
  action: run,
  description: 'Updates the application in destination drectory',
  params: { destination: 'Directory of the Adapt authoring install' },
  options: [['--check', 'Check for update without performing any update actions' ]]
};