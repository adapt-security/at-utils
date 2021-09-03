#!/usr/bin/env node
/**
 * Runs the HTML installer.
 */
const bodyParserJson = require('body-parser').json;
const express = require('express');
const fs = require('fs/promises');
const open = require('open');
const semver = require('semver');
const Utils = require('./Utils');

class UiServer {
  constructor(cwd, action) {
    this.rootDir = cwd;
    this.fileRoot = `${__dirname}/../public/`;
    this.action = action;
    this.port = 8080;
    // init the express app
    this.express = express()
      .get('*', this.indexHandler.bind(this))
      .use(bodyParserJson(), express.static(this.fileRoot));

    if(this.action === 'install') { // install-specific endpoints
      this.express
        .get('/schemas/:type', this.schemasHandler.bind(this))
        .post('/registeruser', this.registerUserHandler.bind(this))
        .post('/download', this.downloadHandler.bind(this))
        .post('/save', this.saveConfigHandler.bind(this))
        .post('/start', this.startAppHandler.bind(this));
    } 
    if(this.action === 'update') { // update-specific endpoints
      this.express
        .post('/update', this.updateHandler.bind(this));
    }
    this.express
      .post('/getlatest', this.getLatestHandler.bind(this))
      .post('/exit', this.exitHandler.bind(this))
      .use(this.errorHandler.bind(this))
      .listen(this.port, () => {
        console.log(`\nInstaller running. \nIf the page doesn't open automatically, please visit http://localhost:8080 in your web browser.`);
        open(`http://localhost:${this.port}`);
      });
  }
  async indexHandler(req, res, next) {
    if(req.path !== '/') {
      return next();
    }
    fs.readFile(`${this.fileRoot}index.html`)
      .then(indexContents => res.send(indexContents.toString().replace(/{{action}}/g, this.action)))
      .catch(next)
  }
  async schemasHandler(req, res, next) {
    try {
      if(!this.schemas) this.schemas = await Utils.getSchemas(this.rootDir);
      res.send(this.schemas[req.params.type]);
    } catch(e) {
      next(e);
    }
  }
  registerUserHandler(req, res, next) {
    Utils.registerUser(req.body).then(() => res.status(201).end(), next);
  }
  saveConfigHandler(req, res, next) {
    Utils.saveConfig(this.rootDir, req.body).then(() => res.json({ rootDir: this.rootDir }), next);
  }
  async downloadHandler(req, res, next) {
    const [latestRelease] = await Utils.getReleases(req.query.prerelease === 'true');
    Utils.cloneRepo(latestRelease.name, this.rootDir).then(() => res.json(latestRelease), next);
  }
  async startAppHandler(req, res, next) {
    try {
      const { App } = require('adapt-authoring-core');
      await App.instance.onReady();
      res.end();
    } catch(e) {
      next(e);
    }
  }
  async getLatestHandler(req, res, next) {
    try {
      const [latestRelease] = await Utils.getReleases(req.query.prerelease === 'true');
      const { version: currentVersion } = require(`${this.rootDir}/package.json`);
      const data = { current: { version: currentVersion } };
      if(semver.gt(latestRelease.name, currentVersion)) {
        data.latest = latestRelease;
      }
      res.json(data);
    } catch(e) {
      next(e);
    }
  }
  async updateHandler(req, res, next) {
    try {
      await Utils.updateRepo(req.query.version, this.rootDir);
      res.end();
    } catch(e) {
      next(e);
    }
  }
  async exitHandler(req, res) {
    res.end();
    const { App } = require('adapt-authoring-core');
    console.log(`\nTo start the app, please run the following commands:\n\ncd ${App.instance.this.rootDir}\nnpm start\n`);
    process.exit();
  }
  errorHandler(error, req, res, next) {
    res.status(500).send(`Error, ${error}`);
  }
}

module.exports = UiServer;