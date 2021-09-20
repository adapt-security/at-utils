/**
 * Installs the application into destination drectory
 * @param {String} [destination]
 */
const path = require('path');
const prompts = require('prompts');
const UiServer = require('../lib/UiServer');
const Utils = require('../lib/Utils');

async function run(destination, _, command) {
  const dest = path.resolve(destination || `${process.cwd()}/adapt-authoring`);
  const { prerelease, tag, ui } = command.opts();

  if(ui) {
    return new UiServer(dest, command.name());
  }
  try {
    await Utils.checkPrerequisites();
  } catch(e) {
    console.log(`\n${e.errors.map(e2 => e2.message).join('\n')}\n`);
    throw e;
  }
  let name = tag;
  if(!name) {
    const [r] = await Utils.getReleases(prerelease);
    name = r.name;
    if(r.prerelease) await doPrereleaseCounter();
  }
  console.log(`Installing Adapt authoring tool ${name} in ${dest}`);
  await Utils.cloneRepo(name, dest);
  // add new clone dest to make sure modules are imported
  Utils.addModulePath(`${dest}/node_modules`);

  try {
    await Utils.startApp();
  } catch(e) {
    return console.log(e);
  }
  await registerUser();
  console.log(`Application installed successfully.`);
}

async function registerUser() {
  try {
    const { email, password } = await prompts([{
      type: 'text',
      name: 'email',
      message: 'Enter an email address to be used as a login for the Super User account'
    }, {
      type: 'password',
      name: 'password',
      message: 'Enter a password for the Super User account'
    }]);
    await prompts([{
      type: 'password',
      name: 'passwordMatch',
      message: 'Please type the password again to confirm',
      validate: val => val !== password ? `Passwords don't match. Please try again` : true
    }]);
    await Utils.registerUser({ email, password });
  } catch(e) {
    console.log(e);
  }
}

async function doPrereleaseCounter() {
  return new Promise((resolve, reject) => {
    console.log('\nWARNING! THIS IS A PRERELEASE AND NOT SUITABLE FOR PRODUCTION. PLEASE PROCEED WITH CAUTION.\n');
    console.log('If this was done in error, please exit the script now using Ctrl+C\n');
    const msg = 'Continuing install in ';
    let countdown = 8;
    let i = 2;
    process.stdout.write(msg);
    const int = setInterval(() => {
      if(i !== 2) {
        process.stdout.write('.');
        i++;
        return;
      }
      i = 0;
      process.stdout.cursorTo(msg.length);
      process.stdout.write(countdown.toString());
      countdown--;
      if(countdown > 0) {
        return;
      }
      clearInterval(int);
      process.stdout.write('\n');
      resolve();
    }, 1000/2);
  });
}
 
module.exports = run;