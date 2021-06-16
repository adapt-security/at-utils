const exec = require('child_process').exec;
const fs = require('fs/promises');
const glob = require('glob');
const http = require('http');
const path = require('path');

const data = {};
const installDir = path.resolve('..');
const rootDir = path.resolve(installDir + '/adapt-authoring');

async function run() {
  try {
    startServer();
  } catch(e) {
    console.log(e);
  }
}
async function cloneRepo(req, res) {
  try {
    await cmd('git clone https://github.com/adapt-security/adapt-authoring.git', installDir);
    res.end();
  } catch(e) {
    res.statusCode = 500;
    res.end(e.message);
  }
}
async function cmd(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, async (error, stdout) => {
      if(error) return reject(error);
      resolve(stdout);
    });
  });
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
              confirmPassword: { description: 'Confirm for the user', type: 'string', format: 'password' }
            },
            required: ['email', 'password', 'confirmPassword']
          }
        }
      };
      resolve();
    });
  });
}
async function installDependencies(req, res) {
  try {
    await cmd('npm i --production', rootDir);
    data.schemas = await getSchemas();
    res.end();
  } catch(e) {
    res.statusCode = 500;
    res.end(e.message);
  }
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
  const configPath = `${rootDir}/conf/${NODE_ENV}.config.js`;
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
      if(req.url === '/clone') return cloneRepo(req, res);
      if(req.url === '/npmi') return installDependencies(req, res);
      if(req.url === '/save') return saveConfig(req, res);
      if(req.url === '/registeruser') return registerUser(req, res);
    }
  }).listen(8080);
  console.log('\nInstaller running. Please visit http://localhost:8080 in your web browser.');
}

module.exports = run();