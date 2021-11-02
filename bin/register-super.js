/**
 * Registers a super user account
 */
const Utils = require('../lib/Utils');

async function run() {
  try {
    await Utils.registerSuperUserCmd();
    console.log(`Super user registered successfully.`);
  } catch(e) {
    console.log(`Super user registration failed, ${e}`);
  }
  process.exit();
}
 
module.exports = run;