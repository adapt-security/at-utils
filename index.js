const fs = require('fs/promises');
const glob = require('glob');
const http = require('http');
const path = require('path');

const data = {};
const rootDir = path.resolve(`${path.resolve('..')}/adapt-authoring`);
const NODE_ENV = 'production';

async function run() {
  try {
    startServer();
  } catch(e) {
    console.log(e);
  }
}
async function getSchemas() {
  return new Promise((resolve, reject) => {
    const pattern = `${rootDir}/node_modules/**/conf/config.schema.json`;
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
      data.userSchema = {
        properties: {
          superUser: {
            title: 'superuser',
            type: 'object',
            properties: {
              email: {description: "Email address for the user", type: "string", format: "email"},
              password: { description: 'Password for the user', type: 'string', format: 'password' },
              confirmPassword: { description: 'Re-enter password', type: 'string', format: 'password' }
            },
            required: ['email', 'password', 'confirmPassword']
          }
        }
      };
      resolve();
    });
  });
}
async function handleBodyData(req) {
  return new Promise((resolve, reject) => {
    let bodyData = '';
    req.on('data', data => bodyData += data);
    req.on('end', () => {
      try {
        req.body = JSON.parse(bodyData);
        resolve();
      } catch(e) {
        reject(e);
      }
    });
  });
}
async function registerUser(req, res) {
  try {
    await handleBodyData(req);
    const { App } = require('adapt-authoring-core');
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
  const configPath = `${rootDir}/conf/${NODE_ENV}.config.js`;
  let config = { ...req.body };
  try {
    await fs.mkdir(rootDir + '/conf', { recursive: true });
  } catch(e) {} // not a problem
  try {
    await fs.writeFile(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);
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
async function startApp(req, res) {
  try {
    const { App } = require('adapt-authoring-core');
    await App.instance.onReady();
    sendResponse(res, 200);
  } catch(e) {
    console.log(e);
  }
}
function startServer() {
  http.createServer(async (req, res) => {
    const isGET = req.method === 'GET';
    const isPOST = req.method === 'POST';
    if(isGET) {
      if(req.url.includes('/schemas/') && !data.configSchemas) {
        await getSchemas();
      }
      if(req.url === '/schemas/config') return sendResponse(res, 200, JSON.stringify(data.configSchemas));
      if(req.url === '/schemas/user') return sendResponse(res, 200, JSON.stringify(data.userSchema));
      return serveFile(req.url, res);
    }
    if(isPOST) {
      if(req.url === '/registeruser') return registerUser(req, res);
      if(req.url === '/save') return saveConfig(req, res);
      if(req.url === '/start') return startApp(req, res);
    }
  }).listen(8080);
  console.log('\nInstaller running. Please visit http://localhost:8080 in your web browser.');
}

module.exports = run();