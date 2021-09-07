/**
 * Lists the prerequisites required for install
 */
async function run() {
  const prereqs = require(`${__dirname}/../package.json`).prerequisites;
  Object.entries(prereqs).forEach(p => console.log(`${p[0]}: ${p[1]}`));
}
 
module.exports = run;