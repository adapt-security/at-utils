/**
 * Lists the prerequisites required for install
 */
async function run(_, command) {
  const prereqs = require(`${process.cwd()}/package.json`).prerequisites;
  Object.entries(prereqs).forEach(p => console.log(`${p[0]}: ${p[1]}`));
}
 
module.exports = run;