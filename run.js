const fs = require('fs/promises');
const glob = require('glob');
const http = require('http');

const data = {};

async function Run() {
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
        resolve(await Promise.all(files.map(async f => {
          const pkg = JSON.parse(await fs.readFile(f.replace('conf/config.schema.json', 'package.json')));
          return { 
            name: pkg.name, 
            description: pkg.description,
            version: pkg.version,
            schema: JSON.parse(await fs.readFile(f)) 
          };
        })));
      } catch(e) {
        reject(e);
      }
    });
  });
}
async function serveFile(filePath, res) {
  try {
    res.writeHead(200);
    if(filePath === '/') filePath = '/index.html';
    res.end(await fs.readFile(`${__dirname}/public${filePath}`));
  } catch(e) {
    res.writeHead(404);
    res.end(`Error, ${e}`);
  }
}
function startServer() {
  http.createServer((req, res) => {
    if(req.method === 'GET' && req.url === '/schemas') {
      res.writeHead(200);
      res.write(JSON.stringify(data.schemas));
      res.end();
      return;
    }
    if(req.method === 'GET') {
      serveFile(req.url, res);
    }
    if(req.method === 'POST' && req.url === '/save') {
      let bodyData = '';
      req.on('data', data => bodyData += data);
      req.on('end', () => {
        fs.writeFile(`${process.cwd()}/conf/production.conf.js`, `module.exports = ${JSON.stringify(JSON.parse(bodyData), null, 2)};`);
      });
    }
  }).listen(8080);
  console.log('\nInstaller running. Please visit http://localhost:8080 in your web browser.');
}

module.exports = Run();
