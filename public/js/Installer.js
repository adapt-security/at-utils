'use strict';

class Installer extends React.Component {
  constructor(props) {
    super(props);
    let config;
    try {
      config = window.config(this);
      if(!config.steps.length) throw new Error('No installer steps defined!');
    } catch(e) {
      return this.onError(e);
    } 
    this.state = { 
      config: {},
      showAdvanced: false,
      step: 0,
      ...config
    };
    this.fetchReleases()
      .then(() => this.performStep())
      .catch(e => this.onError(e));
  }
  render() {
    return (
      <div>
        <Breadcrumbs steps={this.state.steps} activeStep={this.state.step} />
        {this.state.steps.map((s,i) => <StepItem key={i} data={s} isActive={i === this.state.step} />)}
      </div>
    );
  }
  async performStep() {
    const step = this.state.steps[this.state.step];
    if(step.button) await this.awaitButtonPress();
    if(step.actions) for (const a of step.actions) await a.call(this);
    this.setState({ step: this.state.step+1 });
    await this.performStep();
  }

  async awaitButtonPress(eventName = 'click-button') {
    return new Promise(resolve => {
      const resolver = () => {
        document.removeEventListener(eventName, resolver);
        resolve();
      };
      document.addEventListener(eventName, resolver);
    });
  }

  /**
   * Utilities
   */

  post(url, data = {}, options = {}) {
    return this.fetch(url, 'POST', { 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, options);
  }

  async fetch(url, method = 'GET', options = {}) {
    const res = await fetch(url, { ...options, method });
    if(options.handleErrors !== false && res.status > 299) {
      const message = await res.text() ?? res.statusText;
      throw new Error(message);
    }
    return res;
  }

  onError(error) {
    document.dispatchEvent(new CustomEvent('error', { detail: error }));
  }

  /**
   * API calls
   */

  async createUser({ formData }) { 
    const { email, password } = formData.superUser;
    const res = await this.post('/registeruser', { email, password }, { handleErrors: false });
    if(res.status === 400) return this.setState({ validationErrors: { superUser: { __errors: [await res.text()] } } });
    if(res.status > 299) throw new Error(await res.text());
    this.exit();
  }

  async download() { 
    await this.post('/prereq');
    await this.post(`/download?tag=${this.state.selectedRelease}`);
    await this.fetchSchemas();
    await this.generateSecrets();
  }

  async downloadModules() {
    console.log(this.state.localModules);
  }

  async fetchReleases() { 
    const { currentVersion, releases } = await (await this.fetch('/releases')).json();
    const latestRelease = releases.find(r => r.tag_name)?.tag_name;
    this.setState({ 
      currentRelease: currentVersion, 
      newRelease: latestRelease,
      selectedRelease: latestRelease,
      releases
    });
    if(!releases.length) throw new Error('No releases were found!\nYou can try including the --prereleases flag to install a pre-release version (caution: may contain bugs).');
  }

  async fetchSchemas() {
    const configSchemas = Object.values(await (await this.fetch(`/schemas/config`)).json());
    this.setState({ 
      configSchema: { properties: configSchemas.reduce((m,s) => Object.assign(m, { [s.name]: { title: s.name, ...s.schema } }), {}) },
      userSchema: await (await this.fetch(`/schemas/user`)).json() 
    });
  }

  async generateSecrets() { 
    this.setState({ config: { ...this.state.config, ...(await (await this.fetch('/secrets')).json()) } });
  }

  async saveConfig({ formData }) {
    const res = await this.post('/save', formData);
    this.setState({ rootDir: (await res.json()).rootDir });
    await this.post('/start');
  }

  async update() {
    this.post(`/update?version=${this.state.newRelease}`);
    this.exit();
  }
  
  async exit() {
    await this.post('/exit');
  }

  /**
   * UI actions
   */

  toggleLocalModule(name, checked) {
    const localModules = this.state.localModules;
    if(checked) {
      localModules.push(name);
    } else {
      const i = localModules.indexOf(name);
      if(i > -1) localModules.splice(i, 1);
    }
    this.setState({ localModules });
  }

  validateUser({ superUser: { password, confirmPassword } }, errors) {
    if (password !== confirmPassword) {
      errors.superUser.confirmPassword.addError("Passwords don't match");
    }
    return errors;
  }
}