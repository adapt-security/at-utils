import { exec } from 'child_process';
import fetch from 'node-fetch';
import path from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs/promises';
import prompts from 'prompts';
import semver from 'semver';

const GITHUB_REPO_URL = 'https://github.com/adapt-security/adapt-authoring.git';

let app;

export default class Utils {
  static async loadPackage(root, relPath = '') {
    if(!root.startsWith('file:')) root = `file:${root}`;
    return this.loadJson(new URL(path.join(relPath, 'package.json'), root));
  }
  static async importCore(root) {
    return import(pathToFileURL(path.join(root, 'node_modules', 'adapt-authoring-core', 'index.js')));
  }
  static async checkPrerequisites() {
    const { prerequisites: prereqs } = await this.loadPackage(import.meta.url, '..');
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
      const authHash = Buffer.from(`${GITHUB_USER}:${GITHUB_TOKEN}`).toString('base64');
      opts.headers = { Authorization: `Basic ${authHash}` };
    }
    const response = await fetch(`https://api.github.com/repos/adapt-security/adapt-authoring/${endpoint}`, opts);
    if(response.status > 299) {
      throw new Error(response.statusText);
    }
    if(response.status !== 204) return response.json();
  }
  static async getReleases({ includeBranches, includePrereleases, includeDrafts, currentVersion }) {
    const releases = (await this.githubRequest('releases?per_page=10'))
      .reduce((m, r) => {
        if((r.prerelease && !includePrereleases) || r.draft && !includeDrafts) {
          return m;
        }
        return [...m, { ...r, date: new Date(r.published_at) }];
      }, [])
      .filter(r => !currentVersion || semver.gt(r.tag_name, currentVersion))
      .sort((a,b) => semver.rcompare(a.name, b.name));
      
    if(includeBranches) {
      await Promise.all((await this.githubRequest('branches')).map(async b => {
        const commitEndpoint = b.commit.url.slice(b.commit.url.indexOf('commits/'));
        const { commit } = await this.githubRequest(commitEndpoint);
        releases.splice(0, 0, {
          name: `branch:${b.name}`,
          tag_name: b.name,
          date: commit.author.date
        });
      }));
    }
    return releases;
  }
  static async exec(command, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd }, (error, stdout, stderr) => error ? reject(new Error(stderr) || error) : resolve(stdout));
    });
  }
  static async startApp(cwd = process.cwd()) {
    if(!app) {
      const { App } = await Utils.importCore(cwd);
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
  static async cloneRepo(options) {
    console.log(`Cloning ${GITHUB_REPO_URL}#${options.tag} into ${options.cwd}`);
    try {
      await this.exec(`git clone ${!options.devMode ? '--depth 1' : ''} --branch ${options.tag} ${GITHUB_REPO_URL} ${options.cwd}`);
    } catch(e) {
      const error = new Error(`Failed to clone git repository, ${e.message}`);
      error.code = 'GITCLONEEEXIST';
      throw error;
    }
    console.log(`Installing application npm dependencies`);
    try {
      await this.exec(`npm ci`, options.cwd);
    } catch(e) {
      throw new Error(`Failed to installed npm dependencies, ${e.message}`);
    }
  }
  static async updateRepo(tag, cwd) {
    console.log(`Checking out tag ${tag} in ${cwd}`);
    await this.exec(`git fetch --all --tags`, cwd);
    await this.exec(`git reset --hard`, cwd);
    await this.exec(`git checkout tags/${tag} `, cwd);
    console.log(`Installing application npm dependencies`);
    await this.exec(`npm ci`, cwd);
  }
  static async getSchemas(rootDir) {
    const schemas = { config: {}, user: {} };
    const configSchemaPaths = await getConfigSchemaPathsRecursive(path.resolve(rootDir, 'node_modules'));
    await Promise.all(configSchemaPaths.map(async s => {
      const { name, version, description } = await this.loadPackage(path.resolve(s, '..'));
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
    return schemas;
  }
  static async loadJson(url) {
    try {
      return JSON.parse(await fs.readFile(url));
    } catch(e) {
      throw new Error(`Failed to load ${url}`);
    }
  }

  static async saveConfig(rootDir, data) {
    const configPath = `${rootDir}/conf/${process.env.NODE_ENV}.config.js`;
    let config = { ...data };
    try {
      await fs.mkdir(rootDir + '/conf', { recursive: true });
    } catch(e) {} // not a problem
    await fs.writeFile(configPath, `export default ${JSON.stringify(config, null, 2)};`);
  }
  static async registerSuperUserCmd(cwd) {
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
      await this.registerSuperUser(cwd, { email, password });
    } catch(e) {
      console.log(e);
    }
  }
  static async registerSuperUser(cwd, data) {
    const app = await this.startApp(cwd);
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
  const relativeSchemaPath = path.join('conf', 'config.schema.json');
  const contents = await fs.readdir(dir);
  await Promise.all(contents.map(async c => {
    const fullPath = path.resolve(dir, c);
    if((await fs.stat(fullPath)).isDirectory()) return getConfigSchemaPathsRecursive(fullPath, files);
    if(fullPath.endsWith(relativeSchemaPath)) files.push(fullPath);
  }));
  return files;
};
