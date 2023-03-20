#!/usr/bin/env node
import EventEmitter from 'events'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import http from 'http'
import { randomBytes } from 'crypto'
import { spawn } from 'child_process'
import Utils from './Utils.js'

/**
 * Builder for the web app
 */
export default class UiServer extends EventEmitter {
  constructor (options) {
    super()
    this._handlers = { get: {}, post: {} }
    this._server = http.createServer(this.requestHandler.bind(this))
    this.fileRoot = fileURLToPath(new URL('../public', import.meta.url).href)
    this.port = 8080
    this.options = options

    if (this.options.action === 'install') { // install-specific endpoints
      this.get('/schemas/config', this.schemasHandler.bind(this))
      this.get('/schemas/user', this.schemasHandler.bind(this))
      this.post('/download', this.downloadHandler.bind(this))
      this.post('/prereq', this.prereqHandler.bind(this))
      this.get('/secrets', this.generateSecrets.bind(this))
      this.post('/registeruser', this.registerUserHandler.bind(this))
      this.post('/save', this.saveConfigHandler.bind(this))
      this.post('/start', this.startAppHandler.bind(this))
    }
    if (this.options.devMode) {
      this.get('/modules', this.getModulesHandler.bind(this))
      this.post('/installmodules', this.installModulesHandler.bind(this))
    }
    if (this.options.action === 'update') { // update-specific endpoints
      this.post('/update', this.updateHandler.bind(this))
    }
    this.get('/commands', this.commandHandler.bind(this))
    this.get('/releases', this.getReleasesHandler.bind(this))
    this.post('/exit', this.exitHandler.bind(this))

    this._server.listen(this.port, () => {
      console.log('Application running. \nIf the page doesn\'t open automatically, please visit http://localhost:8080 in your web browser.')
      this.openBrowser()
    })
  }

  get (route, handler) { this._handlers.get[route] = handler }
  post (route, handler) { this._handlers.post[route] = handler }

  openBrowser () {
    const getCommand = (platform = process.platform) => {
      if (platform === 'darwin') return 'open'
      if (platform === 'win32') return 'start'
      return 'xdg-open'
    }
    spawn(`${getCommand()} http://localhost:${this.port}`, { shell: true })
      .on('error', e => console.log('spawn error', e))
  }

  async requestHandler (req, res) {
    res.send = (...args) => this.send(res, ...args)
    res.json = (...args) => this.sendJson(res, ...args)

    await this.tryStaticServe(req, res)

    req.query = Utils.parseQuery(req)
    req.body = await Utils.parseBody(req)

    const handler = this._handlers[req.method.toLowerCase()][req.url]
    if (handler) {
      const h = handler(req, res)
      return h?.catch(e => {
        res.send(e.message, e.statusCode || 500)
        this.onExit(e)
      })
    }
    res.send(undefined, 404)
  }

  async tryStaticServe (req, res) {
    try { // serve static file
      const isIndex = req.url === '/'
      if (isIndex) req.url = '/index.html'
      let contents = (await fs.readFile(`${this.fileRoot}${req.url}`))
      const replaceStr = this.options.action + (this.options.devMode ? '-dev' : '')
      if (isIndex) contents = contents.toString().replace(/{{action}}/g, replaceStr)
      res.send(contents)
    } catch (e) {} // probably not a static file, so just continue
  }

  send (res, data, statusCode = 200) {
    res.writeHead(statusCode)
    if (data !== undefined) res.write(data)
    res.end()
  }

  sendJson (res, data, statusCode = 200) {
    this.send(res, JSON.stringify(data), statusCode)
  }

  onExit (error) {
    this.emit('exit', error)
    this._server.close()
  }

  async schemasHandler (req, res) {
    if (!this.schemas) {
      this.schemas = await Utils.getSchemas(this.options.cwd)
    }
    res.json(this.schemas[req.url.replace('/schemas/', '')])
  }

  async registerUserHandler (req, res) {
    try {
      await Utils.registerSuperUser({ ...this.options, superEmail: req.body.email, superPassword: req.body.password })
      res.send(undefined, 201)
    } catch (e) {
      const app = await Utils.startApp()
      res.send(e.constructor.name === 'AdaptError' ? app.lang.translate('en', e) : e.message, e.statusCode)
    }
  }

  async saveConfigHandler (req, res) {
    await Utils.saveConfig(this.options.cwd, req.body)
    res.json({ rootDir: this.options.cwd })
  }

  async downloadHandler (req, res) {
    let tag = req.query.tag
    if (!tag) {
      const [latestRelease] = await Utils.getReleases(this.options)
      if (!latestRelease) {
        throw new Error('No releases found')
      }
      tag = latestRelease.name
    }
    await Utils.cloneRepo({ ...this.options, tag })
    res.end()
  }

  async prereqHandler (req, res) {
    await Utils.checkPrerequisites(this.options)
    res.send()
  }

  async generateSecrets (req, res) {
    const setSecretsRecursive = async (schema, data = {}) => {
      await Promise.all(Object.entries(schema.properties).map(async ([k, v]) => {
        if (v.type === 'object' && v.properties) {
          data[k] = await setSecretsRecursive(v)
        } else if (v?._adapt?.isSecret) {
          data[k] = await randomBytes(32).toString('hex')
        }
      }))
      if (Object.values(data).length && Object.values(data).some(Boolean)) return data
    }
    const { config: schemas } = await Utils.getSchemas(this.options.cwd)
    const data = {}
    await Promise.all(Object.entries(schemas).map(async ([id, { schema }]) => {
      data[id] = await setSecretsRecursive(schema)
    }))
    return res.json(data)
  }

  async startAppHandler (req, res) {
    const app = await Utils.startApp(this.options.cwd)
    const ui = await app.waitForModule('ui')
    ui.postBuildHook.tap(() => res.send())
  }

  async getReleasesHandler (req, res) {
    res.json(this.options.releaseData)
  }

  async getModulesHandler (req, res) {
    res.json((await Utils.getAppDependencies(this.options.cwd)).adapt)
  }

  async installModulesHandler (req, res) {
    await Utils.installLocalModules({ ...this.options, modules: req.body })
    res.send()
  }

  async updateHandler (req, res) {
    await Utils.updateRepo({ ...this.options, tag: req.query.version })
    res.end()
  }

  async commandHandler (req, res) {
    res.json(Utils.getStartCommands(this.options.cwd))
  }

  async exitHandler (req, res) {
    res.end()
    this.onExit(typeof req.body === 'string' ? new Error(req.body) : undefined)
  }
}
