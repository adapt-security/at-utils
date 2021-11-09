const Utils = require('../lib/Utils');

async function run(opts, command) {
  try {
    await Utils.registerSuperUserCmd();
    console.log(`Super user registered successfully.`);
  } catch(e) {
    console.log(`Super user registration failed, ${e}`);
  }
  process.exit();
}
 
module.exports = {
  action: run,
  description: 'Registers a super user account'
};