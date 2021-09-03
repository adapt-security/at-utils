/**
 * Updates the application in destination drectory
 * @param {String} [destination]
 */
const UiServer = require('../lib/UiServer');
const Utils = require('../lib/Utils');

async function run(destination, _, command) {
  const { ui } = command.opts();
  const dest = destination || process.cwd();
  // add dest to make sure modules are imported
  Utils.addModulePath(`${dest}/node_modules`);
  if(ui) {
    return new UiServer(dest, command.name());
  }
  // TODO
}
 
module.exports = run;