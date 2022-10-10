#!/usr/bin/env node
/**
 * Runs the HTML installer.
 */
 import EventEmitter from 'events';
 import { fileURLToPath } from 'url';
 import fs from 'fs/promises';
 import http from 'http';
 import { randomBytes } from 'crypto';
 import { spawn } from 'child_process';
 import Utils from './Utils.js';
 
 export default class UiServer extends EventEmitter {
   constructor({ cwd, action, includePrereleases, includeBranches }) {
     super();
     this._handlers = { get: {}, post: {} };
     this._server = http.createServer(this.requestHandler.bind(this));
     this.action = action;
     this.includePrereleases = includePrereleases;
     this.includeBranches = includeBranches;
     this.fileRoot = fileURLToPath(new URL('../public', import.meta.url).href);
     this.port = 8080;
     this.rootDir = cwd;
 
     if(this.action === 'install') { // install-specific endpoints
       this.get('/schemas/config', this.schemasHandler.bind(this));
       this.get('/schemas/user', this.schemasHandler.bind(this));
       this.post('/download', this.downloadHandler.bind(this));
       this.post('/prereq', this.prereqHandler.bind(this));
       this.get('/secrets', this.generateSecrets.bind(this));
       this.post('/registeruser', this.registerUserHandler.bind(this));
       this.post('/save', this.saveConfigHandler.bind(this));
       this.post('/start', this.startAppHandler.bind(this));
     }
     if(this.action === 'update') { // update-specific endpoints
       this.post('/update', this.updateHandler.bind(this));
     }
     this.get('/releases', this.getReleasesHandler.bind(this));
     this.post('/exit', this.exitHandler.bind(this));
 
     this._server.listen(this.port, () => {
       console.log(`Application running. \nIf the page doesn't open automatically, please visit http://localhost:8080 in your web browser.`);
       this.openBrowser();       
     });
   }
   get(route, handler) { this._handlers.get[route] = handler; }
   post(route, handler) { this._handlers.post[route] = handler }
 
   openBrowser() {
     const getCommand = (platform = process.platform) => {
       if(platform === 'darwin') return 'open';
       if(platform === 'win32') return 'start';
       return 'xdg-open';
     };
     spawn(`${getCommand()} http://localhost:${this.port}`, { shell: true })
       .on('error', e => console.log('spawn error', e));
   }

   async requestHandler(req, res) {
     res.send = (...args) => this.send(res, ...args);
     res.json = (...args) => this.sendJson(res, ...args);
     
     await this.tryStaticServe(req, res);
 
     req.query = Utils.parseQuery(req);
     req.body = await Utils.parseBody(req);
     
     const handler = this._handlers[req.method.toLowerCase()][req.url];
     if(handler) {
       const h = handler(req, res);
       return h?.catch(e => {
         res.send(e.message, e.statusCode || 500);
         this.onExit(e);
       });
     }
     res.send(undefined, 404);
   }
   async tryStaticServe(req, res) {
     try { // serve static file
       const isIndex = req.url === '/';
       if(isIndex) req.url = '/index.html';
       let contents = (await fs.readFile(`${this.fileRoot}${req.url}`));
       if(isIndex) contents = contents.toString().replace(/{{action}}/g, this.action);
       res.send(contents);
     } catch(e) {} // probably not a static file, so just continue
   }
   async schemasHandler(req, res) {
     if(!this.schemas) {
       this.schemas = await Utils.getSchemas(this.rootDir);
     }
     res.json(this.schemas[req.url.replace('/schemas/', '')]);
   }
   async registerUserHandler(req, res) {
     try {
       await Utils.registerSuperUser(this.rootDir, req.body);
       res.send(undefined, 201);
     } catch(e) {
       const app = await Utils.startApp();
       res.send(app.lang.t(`error.${e.code}`, e.data), e.statusCode);
     }
   }
   async saveConfigHandler(req, res) {
     await Utils.saveConfig(this.rootDir, req.body);
     res.json({ rootDir: this.rootDir });
   }
   async downloadHandler(req, res) {
     let version = req.query.tag;
     if(!version) {
       const [latestRelease] = await Utils.getReleases({ includePrereleases: this.includePrereleases });
       if(!latestRelease) {
         throw new Error('No releases found');
       }
       version = latestRelease.name;
     }
     await Utils.cloneRepo(version, this.rootDir)
     res.end();
   }
   async prereqHandler(req, res) {
     await Utils.checkPrerequisites();
     res.send();
   }
   async generateSecrets(req, res) {
     const setSecretsRecursive = async (schema, data = {}) => {
       await Promise.all(Object.entries(schema.properties).map(async ([k, v]) => {
         if(v.type === 'object' && v.properties) {
           data[k] = await setSecretsRecursive(v);
          } else if(v?._adapt?.isSecret) {
            data[k] = await randomBytes(32).toString('hex');
         }
       }));
       if(Object.values(data).length && Object.values(data).some(Boolean)) return data;
     };
     const { config: schemas } = await Utils.getSchemas(this.rootDir);
     const data = {};
     await Promise.all(Object.entries(schemas).map(async ([id, { schema }]) => {
      data[id] = await setSecretsRecursive(schema);
     }));
     return res.json(data);
   }
   async startAppHandler(req, res) {
     const { App } = await Utils.importCore(this.rootDir);
     await App.instance.onReady();
     res.send();
   }
   async getReleasesHandler(req, res) {
     let currentVersion;
     try {
       const { version } = await Utils.loadPackage(this.rootDir);
       currentVersion = version;
     } catch {}
     res.json({
       currentVersion,
       releases: await Utils.getReleases({ 
         includeBranches: this.includeBranches,
         includePrereleases: this.includePrereleases, 
         currentVersion, 
       })
     });
   }
   async updateHandler(req, res) {
     await Utils.updateRepo(req.query.version, this.rootDir);
     res.end();
   }
   async exitHandler(req, res) {
     res.end();
     this.onExit();
   }
   send(res, data, statusCode = 200) {
     res.writeHead(statusCode);
     if(data !== undefined) res.write(data);
     res.end();
   }
   sendJson(res, data, statusCode = 200) {
     this.send(res, JSON.stringify(data), statusCode);
   }
   onExit(error) {
     this.emit('exit', error);
   }
 }