import Utils from '../lib/Utils.js';

async function run(opts, command) {
  try {
    await Utils.registerSuperUserCmd();
    console.log(`Super user registered successfully.`);
  } catch(e) {
    console.log(`Super user registration failed, ${e}`);
  }
  process.exit();
}
 
export default {
  action: run,
  description: 'Registers a super user account'
};