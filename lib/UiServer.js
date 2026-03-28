#!/usr/bin/env node
import EventEmitter from 'events'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import http from 'http'
import path from 'path'
import { randomBytes } from 'crypto'
import { spawn } from 'child_process'
import Installer from './Installer.js'
import getReleases from './utils/getReleases.js'
import getSchemas from './utils/getSchemas.js'
import getStartCommands from './utils/getStartCommands.js'
import parseBody from './utils/parseBody.js'
import parseQuery from './utils/parseQuery.js'
import saveConfig from './utils/saveConfig.js'

export default class UiServer extends EventEmitter {
  constructor (options) {
    super()
    this._handlers = { get: {}, post: {} }
    this._server = http.createServer(this.requestHandler.bind(this))
    this.fileRoot = fileURLToPath(new URL('../public', import.meta.url).href)
    this.port = 8080
    this.options = options
    this.installer = new Installer(options)

    if (this.options.action === 'install') {
      this.get('/schemas/config', this.schemasHandler.bind(this))
      this.post('/download', this.downloadHandler.bind(this))
      this.get('/secrets', this.generateSecrets.bind(this))
      this.post('/save', this.saveConfigHandler.bind(this))
      this.post('/superuser', this.superUserHandler.bind(this))
    }
    if (this.options.action === 'update') {
      this.post('/update', this.updateHandler.bind(this))
    }
    this.get('/commands', this.commandHandler.bind(this))
    this.get('/releases', this.getReleasesHandler.bind(this))
    this.post('/exit', this.exitHandler.bind(this))

    this._activeConnections = new Set()
    this._exiting = false

    this._server.on('connection', socket => {
      this._activeConnections.add(socket)
      socket.on('close', () => {
        this._activeConnections.delete(socket)
        if (this._activeConnections.size === 0 && !this._exiting) {
          this._idleTimer = setTimeout(() => {
            if (this._activeConnections.size === 0 && !this._exiting) {
              this.onExit(new Error('Client disconnected'))
            }
          }, 3000)
        }
      })
    })

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

    const serveSuccess = await this.tryStaticServe(req, res)
    if (serveSuccess) {
      return
    }
    req.query = parseQuery(req)
    req.body = await parseBody(req)

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
    try {
      const isIndex = req.url === '/'
      if (isIndex) req.url = '/index.html'
      let contents = (await fs.readFile(`${this.fileRoot}${req.url}`))
      if (isIndex) contents = contents.toString().replace(/{{action}}/g, this.options.action)
      res.send(contents)
      return true
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
    if (this._exiting) return
    this._exiting = true
    clearTimeout(this._idleTimer)
    this.emit('exit', error)
    this._server.close()
  }

  async schemasHandler (req, res) {
    if (!this.schemas) {
      this.schemas = await getSchemas(this.options.cwd)
    }
    res.json(this.schemas[req.url.replace('/schemas/', '')])
  }

  async saveConfigHandler (req, res) {
    await saveConfig(this.options.cwd, req.body)
    res.json({ rootDir: this.options.cwd })
  }

  async downloadHandler (req, res) {
    let tag = req.query.tag
    if (!tag) {
      const [latestRelease] = await getReleases(this.options)
      if (!latestRelease) {
        throw new Error('No releases found')
      }
      tag = latestRelease.name
    }
    this.installer.options.tag = tag
    await this.installer.install()
    res.end()
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
    const { config: schemas } = await getSchemas(this.options.cwd)
    const data = {}
    await Promise.all(Object.entries(schemas).map(async ([id, { schema }]) => {
      data[id] = await setSecretsRecursive(schema)
    }))
    return res.json(data)
  }

  async superUserHandler (req, res) {
    const { email } = req.body
    if (!email) return res.send('Email is required', 400)
    const password = randomBytes(16).toString('base64url')
    const confDir = path.resolve(this.options.cwd, 'conf')
    await fs.mkdir(confDir, { recursive: true })
    await fs.writeFile(path.resolve(confDir, '.superuser'), JSON.stringify({ email, password }, null, 2))
    res.json({ password })
  }

  async getReleasesHandler (req, res) {
    res.json(this.options.releaseData)
  }

  async updateHandler (req, res) {
    this.installer.options.tag = req.query.version
    await this.installer.update()
    res.end()
  }

  async commandHandler (req, res) {
    res.json(getStartCommands(this.options.cwd))
  }

  async exitHandler (req, res) {
    res.end()
    this.onExit(typeof req.body === 'string' ? new Error(req.body) : undefined)
  }
}
