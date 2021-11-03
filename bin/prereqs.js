/**
 * Lists the prerequisites required for install
 */
async function run() {
  try {
    const prereqs = require(`${__dirname}/../package.json`).prerequisites;
    Object.entries(prereqs).forEach(p => console.log(`${p[0]}: ${p[1]}`));
  } catch(e) {
    console.log(`Failed to load prerequisites, ${e}`);
  }
}
 
module.exports = run;