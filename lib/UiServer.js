#!/usr/bin/env node
/**
 * Runs the HTML installer.
 */
const EventEmitter = require('events');
const fs = require('fs/promises');
const http = require('http');
const open = require('open');
const Utils = require('./Utils');

class UiServer extends EventEmitter {
  constructor({ cwd, action, includePrereleases, includeBranches }) {
    super();
    this._handlers = { get: {}, post: {} };
    this._server = http.createServer(this.requestHandler.bind(this));
    this.action = action;
    this.includePrereleases = includePrereleases;
    this.includeBranches = includeBranches;
    this.fileRoot = `${__dirname}/../public/`;
    this.port = 8080;
    this.rootDir = cwd;

    if(this.action === 'install') { // install-specific endpoints
      this.get('/schemas/config', this.schemasHandler.bind(this));
      this.get('/schemas/user', this.schemasHandler.bind(this));
      this.post('/download', this.downloadHandler.bind(this));
      this.post('/prereq', this.prereqHandler.bind(this));
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
      console.log(`\nApplication running. \nIf the page doesn't open automatically, please visit http://localhost:8080 in your web browser.`);
      open(`http://localhost:${this.port}`)
        .catch(e => console.log(e));
    });
  }
  get(route, handler) { this._handlers.get[route] = handler; }
  post(route, handler) { this._handlers.post[route] = handler }

  async requestHandler(req, res) {
    res.send = (...args) => this.send(res, ...args);
    res.json = (...args) => this.sendJson(res, ...args);
    
    await this.tryStaticServe(req, res);

    req.query = Utils.parseQuery(req);
    req.body = await Utils.parseBody(req);
    
    const handler = this._handlers[req.method.toLowerCase()][req.url];
    if(handler) {
      const h = handler(req, res);
      return h?.catch?.(e => {
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
  registerUserHandler(req, res) {
    Utils.registerSuperUser(req.body).then(() => res.send(undefined, 201));
  }
  saveConfigHandler(req, res) {
    Utils.saveConfig(this.rootDir, req.body).then(() => res.json({ rootDir: this.rootDir }));
  }
  async downloadHandler(req, res) {
    let version = this.tag;
    if(!tag) {
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
  async startAppHandler(req, res) {
    await Utils.addModulePath(this.rootDir);
    const { App } = require('adapt-authoring-core');
    await App.instance.onReady();
    res.send();
  }
  async getReleasesHandler(req, res) {
    console.log('getReleasesHandler', this.includeBranches);
    let currentVersion;
    try {
      const { version } = require(`${this.rootDir}/package.json`);
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

module.exports = UiServer;