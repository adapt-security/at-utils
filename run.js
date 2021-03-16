const fs = require('fs/promises');
const glob = require('glob');
const http = require('http');

const data = {};

async function Run() {
  try {
    data.schemas = await getSchemas();
    await startServer();
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
async function startServer() {
  return new Promise(async (resolve, reject) => {
    http.createServer((req, res) => {
      switch(req.url) {
        case '/schemas':
          res.writeHead(200);
          res.write(JSON.stringify(data.schemas));
          res.end();
          break;
        default:
          serveFile(req.url, res);
      }
    }).listen(8080);
    resolve();
  });
}

module.exports = Run();
