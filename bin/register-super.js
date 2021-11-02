/**
 * Registers a super user account
 * @param {String} [destination]
 */
const prompts = require('prompts');
const Utils = require('../lib/Utils');

async function run() {
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
    await Utils.registerSuperUser({ email, password });
  } catch(e) {
    console.log(e);
  }
}
 
module.exports = run;