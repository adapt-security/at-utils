import { exec } from 'child_process';
import path from 'path';
import prompts from 'prompts';

const GITHUB_ORG_URL = 'https://github.com/adapt-security/adapt-authoring.git';
const GITHUB_REPO = 'adapt-authoring';
export default class CliCommand {
  get config() { 
    return {
      description: undefined, // String, A human-readable description of the command
      options: [], // 2d array, e.g. [['--option', 'Option description ]]
      params: {} // Object, e.g. { param: 'Param description' }
    };
  }
  async run(destination, opts, command) {
    this.setOptions(destination, opts, command);
    this.runTask();
  }
  async runTask() {
    throw new Error('Should be overridden in subclass'); 
  }
  setOptions(destination, opts, command) {
    let { branches, dev, drafts, prerelease, tag, ui } = opts;
    if(dev) {
      branches = drafts = prerelease = true;
    }
    this.options = {
      action: command.name(),
      cwd: path.resolve(destination || `${process.cwd()}/adapt-authoring`),
      devMode: dev,
      includeBranches: branches,
      includeDrafts: drafts,
      includePrereleases: prerelease,
      tag,
      ui
    };
  }
  static async cloneRepo(options) {
    const url = `${GITHUB_ORG_URL}/${options.repo || GITHUB_REPO}`;
    console.log(`Cloning ${url}#${options.tag} into ${options.cwd}`);
    try {
      await this.exec(`git clone ${!options.devMode ? '--depth 1' : ''} --branch ${options.tag} ${url} ${options.cwd}`);
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
  async updateRepo() {
    console.log(`Checking out tag ${this.options.tag} in ${this.options.cwd}`);
    await this.exec(`git fetch --all --tags`, this.options.cwd);
    await this.exec(`git reset --hard`, this.options.cwd);
    await this.exec(`git checkout tags/${this.options.tag} `, this.options.cwd);
    await fs.rmdir(`${this.options.cwd}/node_modules`, { recursive: true });
    console.log(`Installing application npm dependencies`);
    await this.exec(`npm ci`, this.options.cwd);
  }
  async getInput(configs, message) {
    if(message) {
      console.log(message, '\n');
    }
    return prompts(configs);
  }
  async exec(command, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd }, (error, stdout, stderr) => error ? reject(new Error(stderr) || error) : resolve(stdout));
    });
  }
}