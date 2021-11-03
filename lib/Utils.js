const exec = require('child_process').exec;
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs/promises');
const prompts = require('prompts');
const semver = require('semver');

const GITHUB_REPO_URL = 'https://github.com/adapt-security/adapt-authoring.git';

let app;

class Utils {
  static addModulePath(newPath) {
    process.env.NODE_PATH = newPath;
    module.constructor._initPaths();
  }
  static async checkPrerequisites() {
    const prereqs = require(`${__dirname}/../package.json`).prerequisites;
    const failedPrereqs = (await Promise.allSettled(Object.entries(prereqs).map(([name, version]) => {
      return new Promise((resolve, reject) => {
        exec(`${name} --version`, async (error, stdout) => {
          if(error) return reject(new Error(`Missing prerequisite '${name}'`));
          const match = stdout.match(/(\d+\.\d+\.\d+)\D/);
          const installedVersion = match && match[1];
          if(!semver.satisfies(installedVersion, version)) return reject(new Error(`Installed version of ${name} (${installedVersion}) doesn't satisfy required version (${version})`));
          resolve();
        });
      });
    }))).filter(p => p.status === "rejected").map(p => p.reason);
    if(failedPrereqs.length) {
      let msg = `Prerequisite check failed:\n`;
      failedPrereqs.forEach(e2 => msg += `- ${e2.message}\n`);
      throw new Error(msg);
    }
  }
  static async githubRequest(endpoint, opts={}) {
    const { GITHUB_USER, GITHUB_TOKEN } = process.env;

    if(GITHUB_USER && GITHUB_TOKEN) {
      const authHash = Buffer.from(`${process.env}:${process.env.GITHUB_TOKEN}`).toString('base64');
      opts.headers = { Authorization: `Basic ${authHash}` };
    }
    const response = await fetch(`https://api.github.com/repos/adapt-security/adapt-authoring/${endpoint}`, opts);
    if(response.status > 299) {
      throw new Error(response.statusText);
    }
    if(response.status !== 204) return response.json();
  }
  static async getReleases(includePrereleases, includeDrafts) {
    const releases = (await this.githubRequest('releases?per_page=10'))
      .reduce((m, r) => {
        if((r.prerelease && !includePrereleases) || r.draft && !includeDrafts) {
          return m;
        }
        return [...m, { ...r, date: new Date(r.published_at) }];
      }, [])
      .sort((a,b) => semver.rcompare(a.name, b.name));

    if(!releases.length) {
      throw new Error('No releases found');
    }
    return releases;
  }
  static async exec(command, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd }, (error, stdout, stderr) => error ? reject(new Error(stderr) || error) : resolve(stdout));
    });
  }
  static async startApp() {
    if(!app) {
      const { App } = require('adapt-authoring-core');
      try {
        process.env.ADAPT_AUTHORING_LOGGER__mute = true
        await App.instance.onReady();
        app = App.instance;
      } catch(e) {
        return console.log(e);
      }
    }
    return app;
  }
  static async cloneRepo(tag, cwd) {
    console.log(`Cloning ${GITHUB_REPO_URL} into ${cwd}`);
    try {
      await this.exec(`git clone --depth 1 --branch ${tag} ${GITHUB_REPO_URL} ${cwd}`);
    } catch(e) {
      throw new Error(`Failed to clone git repository, ${e.message}`);
    }
    console.log(`Installing application npm dependencies`);
    try {
      await this.exec(`npm ci`, cwd);
    } catch(e) {
      throw new Error(`Failed to installed npm dependencies, ${e.message}`);
    }
  }
  static async updateRepo(tag, cwd) {
    console.log(`Checking out tag ${tag} in ${cwd}`);
    await this.exec(`git fetch --all --tags`, cwd);
    await this.exec(`git reset --hard`, cwd);
    await this.exec(`git checkout tags/${tag} `, cwd);
    await fs.rmdir(`${cwd}/node_modules`, { recursive: true });
    console.log(`Installing application npm dependencies`);
    await this.exec(`npm ci`, cwd);
  }
  static async getSchemas(rootDir) {
    const schemas = { config: {}, user: {} };
    const configSchemaPaths = await getConfigSchemaPathsRecursive(path.resolve(rootDir, 'node_modules'));
    await Promise.all(configSchemaPaths.map(async s => {
      const { name, version, description } = await this.loadJson(path.resolve(s, '../../package.json'));
      const schema = await this.loadJson(s);
      schemas.config[name] = { name, description, version, schema };
    }));
    schemas.user = {
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
  }
  static async loadJson(filePath) {
    try {
      return JSON.parse(await fs.readFile(filePath));
    } catch(e) {
      throw new Error(`Failed to load ${path.basename(filePath)} at ${s}`);
    }
  }

  static async saveConfig(rootDir, data) {
    const configPath = `${rootDir}/conf/${process.env.NODE_ENV}.config.js`;
    let config = { ...data };
    try {
      await fs.mkdir(rootDir + '/conf', { recursive: true });
    } catch(e) {} // not a problem
    await fs.writeFile(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);
  }
  static async registerSuperUserCmd() {
    try {
      const { email, password } = await prompts([{
        type: 'text',
        name: 'email',
        message: 'Enter an email address to be used as a login for the Super User account'
      }, {
        type: 'password',
        name: 'password',
        message: 'Enter a password for the Super User account'
      }]);
      await prompts([{
        type: 'password',
        name: 'passwordMatch',
        message: 'Please type the password again to confirm',
        validate: val => val !== password ? `Passwords don't match. Please try again` : true
      }]);
      await this.registerSuperUser({ email, password });
    } catch(e) {
      console.log(e);
    }
  }
  static async registerSuperUser(data) {
    const app = await this.startApp();
    const shortName = 'superuser';
    const [localauth, roles, users] = await app.waitForModule('localauth', 'roles', 'users');
    const existing = await users.find({ $or: [{ email: data.email }, { shortName }] });
    if(existing?.length) {
      throw new Error(`super user account already exists with the email ${existing.map(u => u.email)}`);
    }
    const [superuser] = await roles.find({ shortName });
    await localauth.register(Object.assign({}, data, {
      firstName: 'Super',
      lastName: 'User',
      roles: [superuser._id.toString()]
    }));
  }
  static parseQuery(req) {
    const [url,query] = req.url.split('?');
    if(!query) {
      return {};
    }
    req.url = url;
    return query.split('&').reduce((q,s) => {
      const [k,v] = s.split('=');
      return { ...q, [k]: v };
    }, {});
  }
  static async parseBody(req) {
    if(req.method !== 'POST') {
      return {};
    }
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', data => body += data);
      req.on('error', e => reject(e));
      req.on('end', () => resolve(body.length > 0 ? JSON.parse(body) : undefined));
    });
  }
}

async function getConfigSchemaPathsRecursive(dir, files = []) {
  const relativeSchemaPath = 'conf/config.schema.json';
  const contents = await fs.readdir(dir);
  await Promise.all(contents.map(async c => {
    const fullPath = path.resolve(dir, c);
    if((await fs.stat(fullPath)).isDirectory()) return getConfigSchemaPathsRecursive(fullPath, files);
    if(fullPath.endsWith(relativeSchemaPath)) files.push(fullPath);
  }));
  return files;
};

module.exports = Utils;