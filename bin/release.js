/**
 * Performs relevant release tasks
 * @param {String} [destination]
 */
const fs = require('fs/promises');
const inquirer = require('inquirer');
const semver = require('semver');
const Utils = require('../lib/Utils');

async function run(destination, _, command) {  
  console.log(`This is the Adapt authoring tool automated releaser`);
  
  if(!process.env.GITHUB_USER || !process.env.GITHUB_TOKEN) {
    throw new Error('Missing GITHUB_USER or GITHUB_TOKEN environment variables. Please make sure that these are set and that you have push access to the Adapt authoring tool repo.');
  }
  try {
    await Utils.githubRequest(`collaborators/${process.env.GITHUB_USER}`);
  } catch(e) {
    throw new Error('You do not have the required permissions to do a release.');
  }
  const dest = destination || process.cwd();
  const releases = (await Utils.getReleases(true, true)).filter(r => r.draft);

  if(!releases.length) {
    throw new Error('There are no releases waiting to be pushed');
  }
  const { newVersion } = await inquirer.prompt([{
    type: 'list',
    name: 'newVersion',
    message: 'Please confirm the release to publish',
    choices: releases
  }]);
  if(!semver.valid(newVersion) || newVersion[0] !== 'v') {
    throw new Error(`Invalid version number used for release (${newVersion}). Please update the GitHub release and try again.`);
  }
  const releaseData = releases.find(r => r.name === newVersion);
  
  await updatePackage(dest, releaseData);
  await updateChangelog(dest, releaseData);
  await updateDocs();

  await Utils.exec(`git stage *`);
  await Utils.exec(`git commit -m "Release"`);
  await Utils.exec(`git push`);
  try {
    await Utils.exec(`git tag ${newVersion}`);
    await Utils.exec(`git push origin ${newVersion}`);
  } catch(e) {}

  await Utils.githubRequest(`releases/${releaseData.id}`, { method: 'patch', body: JSON.stringify({ draft: false }) });

  console.log(`Successfully released ${newVersion}!`);
}
async function updatePackage(dest, releaseData) {
  const fileDest = `${dest}/package.json`;
  let pkg;
  try {
    pkg = require(fileDest);
  } catch(e) {
    throw new Error(`Couldn't find installation in ${dest}`);
  }
  const contents = (await fs.readFile(fileDest)).toString().replace(pkg.version, releaseData.name.slice(1));
  return fs.writeFile(fileDest, contents);
}
async function updateChangelog(dest, releaseData) {
  let releaseMd = `## [${releaseData.name.slice(1)}](${releaseData.html_url}) - ${formatDate(new Date())}\n\n${releaseData.body}\n\n`;
  const milestone = (await Utils.githubRequest(`milestones`)).find(m => m.title === releaseData.name);

  if(milestone) {
    const issues = (await Utils.githubRequest(`issues?milestone=${milestone.number}&state=closed`));
    if(issues.length) {
      releaseMd += '### Changes\n';
      issues.forEach(i => releaseMd += `- ${i.title} ([#${i.number}](${i.html_url}))\n`);
      releaseMd += '\n';
    }
  }
  const fileDest = `${dest}/CHANGELOG.md`;
  const contents = (await fs.readFile(fileDest)).toString();
  const match = contents.match(/## \[\d+\.\d+.\d+(\-\w+\.\d+)?\]\(.+\)/);

  if(!match) {
    throw new Error('Failed to parse CHANGELOG.md.');
  }
  return fs.writeFile(fileDest, `${contents.slice(0, match.index)}${releaseMd}${contents.slice(match.index)}`);
}
async function updateDocs() {
}
function formatDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth()+1).toString().padStart(2,'0');
  const date = (dateObj.getDate()).toString().padStart(2,'0');
  return `${year}/${month}/${date}`;
}

module.exports = run;