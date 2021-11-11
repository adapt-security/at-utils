const Utils = require("../lib/Utils");

async function run(opts, command) {
  try {
    const prereqs = require(`${__dirname}/../package.json`).prerequisites;
    Object.entries(prereqs).forEach(p => console.log(`${p[0]}: ${p[1]}`));
    if(opts.check) await Utils.checkPrerequisites();
  } catch(e) {
    console.log(`Failed to load prerequisites, ${e}`);
  }
}
 
module.exports = {
  action: run,
  description: 'Lists the prerequisites required for install',
  options: [['-c', '--check', 'Whether prerequisites should be checked']]
};