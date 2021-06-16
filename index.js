const fs = require('fs/promises');
const glob = require('glob');
const http = require('http');

const data = {};

async function run() {
  try {
    data.schemas = await getSchemas();
    startServer();
  } catch(e) {
    console.log(e);
  }
}
async function getSchemas() {
  return new Promise((resolve, reject) => {
    const pattern = `${process.cwd()}/node_modules/**/conf/config.schema.json`;
    glob(pattern, async (error, files) => {
      if(error) return reject(error);
      try {
        data.configSchemas = await Promise.all(files.map(async f => {
          const pkg = JSON.parse(await fs.readFile(f.replace('conf/config.schema.json', 'package.json')));
          return { 
            name: pkg.name, 
            description: pkg.description,
            version: pkg.version,
            schema: JSON.parse(await fs.readFile(f)) 
          };
        }));
      } catch(e) {
        reject(e);
      }
      data.userSchema = JSON.parse(await fs.readFile(`${process.cwd()}/node_modules/adapt-authoring-localauth/schema/localauthuser.schema.json`)) ;
      resolve();
    });
  });
}
async function registerUser(req, res) {
  try {
    await handleBodyData(req);
    const [localauth, roles] = await App.instance.waitForModule('localauth', 'roles');
    const [superuser] = await roles.find({ shortName: 'superuser' });
    await localauth.register(Object.assign({}, req.body, { 
      firstName: 'Super', 
      lastName: 'User',
      roles: [superuser._id.toString()]
    }));
    sendResponse(res, 201);
  } catch(e) {
    sendResponse(res, 500, `Error, ${e}`);
  }
}
async function saveConfig(req, res) {
  try {
    await handleBodyData(req);
  } catch(e) {
    sendResponse(res, 500, `Error, ${e}`);
  }
  const configPath = `${process.cwd()}/conf/${NODE_ENV}.config.js`;
  let config = { ...req.body };
  try {
    config = { ...require(configPath), ...config };
  } catch(e) {} // not a problem
  try {
    await fs.writeFile(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);
    await App.instance.onReady();
    sendResponse(res, 200);
  } catch(e) {
    sendResponse(res, 500, `Error, ${e}`);
  }
}
function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode);
  if(data) res.write(data);
  res.end();
}
async function serveFile(filePath, res) {
  try {
    if(filePath === '/') filePath = '/index.html';
    sendResponse(res, 200, await fs.readFile(`${__dirname}/public${filePath}`));
  } catch(e) {
    sendResponse(res, 404, `Error, ${e}`);
  }
}
function startServer() {
  // process.env.NODE_ENV = NODE_ENV;
  http.createServer((req, res) => {
    const isGET = req.method === 'GET';
    const isPOST = req.method === 'POST';
    if(isGET) {
      if(req.url === '/schemas/config') return sendResponse(res, 200, JSON.stringify(data.configSchemas));
      if(req.url === '/schemas/user') return sendResponse(res, 200, JSON.stringify(data.userSchema));
      return serveFile(req.url, res);
    }
    if(isPOST) {
      if(req.url === '/save') return saveConfig(req, res);
      if(req.url === '/registeruser') return registerUser(req, res);
    }
  }).listen(8080);
  console.log('\nInstaller running. Please visit http://localhost:8080 in your web browser.');
}

module.exports = run();