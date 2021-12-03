import Utils from "../lib/Utils.js";

async function run(opts, command) {
  try {
    const { prerequisites: prereqs } = await Utils.loadPackage(import.meta.url, '..');
    Object.entries(prereqs).forEach(p => console.log(`${p[0]}: ${p[1]}`));
    if(opts.check) await Utils.checkPrerequisites();
  } catch(e) {
    console.log(`Failed to load prerequisites, ${e}`);
  }
}
 
export default {
  action: run,
  description: 'Lists the prerequisites required for install',
  options: [['-c', '--check', 'Whether prerequisites should be checked']]
};