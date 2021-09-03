const exec = require('child_process').exec;
const fetch = require('node-fetch');
const fs = require('fs/promises');
const glob = require('glob');
const semver = require('semver');

const GITHUB_REPO_URL = 'https://github.com/adapt-security/adapt-authoring.git';

let app;

class Utils {
  static addModulePath(newPath) {
    // module.paths.splice(0, 0, newPath);
    process.env.NODE_PATH = newPath;
    module.constructor._initPaths();
  }
  static async getReleases(includePrereleases) {
    const response = await fetch('https://api.github.com/repos/adapt-security/adapt-authoring/releases?per_page=10');
    if(response.status > 299) {
      throw new Error(response.statusText);
    }
    const releases = (await response.json())
      .reduce((m, r) => {
        if(!r.draft && (includePrereleases || !r.prerelease)) {
          m.push({ 
            name: r.tag_name, 
            date: new Date(r.published_at),
            prerelease: r.prerelease
          });
        }
        return m;
      }, [])
      .sort((a,b) => semver.rcompare(a.name, b.name));

    if(!releases.length) {
      throw new Error('No releases found');
    }
    return releases;
  }
  static async exec(command, cwd) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: cwd || process.cwd() }, (error, stdout) => error ? reject(error) : resolve(stdout));
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
    await this.exec(`git clone --depth 1 --branch ${tag} ${GITHUB_REPO_URL} ${cwd}`);
    console.log(`Installing application npm dependencies`);
    await this.exec(`npm ci`, cwd);
  }
  static async updateRepo(tag, cwd) {
    console.log(`Checking out tag ${tag} in ${cwd}`);
    await this.exec(`git fetch --all --tags`, cwd);
    await this.exec(`git checkout tags/${tag} `, cwd);
    await fs.rmdir(`${cwd}/node_modules`, { recursive: true });
    console.log(`Installing application npm dependencies`);
    await this.exec(`npm ci`, cwd);
  }
  static async getSchemas(rootDir) {
    return new Promise((resolve, reject) => {
      const schemas = { config: {}, user: {} };
      const pattern = `${rootDir}/node_modules/**/conf/config.schema.json`;
      glob(pattern, async (error, files) => {
        if(error) return reject(error);
        try {
          await Promise.all(files.map(async f => {
            const pkg = JSON.parse(await fs.readFile(f.replace('conf/config.schema.json', 'package.json')));
            schemas.config[pkg.name] = { 
              name: pkg.name,
              description: pkg.description,
              version: pkg.version,
              schema: JSON.parse(await fs.readFile(f))
            };
          }));
        } catch(e) {
          reject(e);
        }
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
        resolve(schemas);
      });
    });
  }
  static async saveConfig(rootDir, data) {
    const configPath = `${rootDir}/conf/${process.env.NODE_ENV}.config.js`;
    let config = { ...data };
    try {
      await fs.mkdir(rootDir + '/conf', { recursive: true });
    } catch(e) {} // not a problem
    await fs.writeFile(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);
  }
  static async registerUser(data) {
    const app = await this.startApp();
    const [localauth, roles] = await app.waitForModule('localauth', 'roles');
    const [superuser] = await roles.find({ shortName: 'superuser' });
    await localauth.register(Object.assign({}, data, {
      firstName: 'Super',
      lastName: 'User',
      roles: [superuser._id.toString()]
    }));
  }
}

module.exports = Utils;