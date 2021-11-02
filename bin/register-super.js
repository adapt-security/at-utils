/**
 * Registers a super user account
 */
const Utils = require('../lib/Utils');

async function run() {
  await Utils.registerSuperUserCmd();
  console.log(`Super user registered successfully.`);
  process.exit();
}
 
module.exports = run;