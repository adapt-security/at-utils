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
    config.steps = [
      {
        title: `Checking releases`,
        breadcrumb: false,
        icon: 'lnr-hourglass',
        showLoadingBar: true,
        actions: [this.fetchReleases],
        haltOnComplete: true
      },
      {
        title: `No releases found`,
        breadcrumb: false,
        icon: `lnr-thumbs-${config.action === 'update' ? 'up' : 'down'}`,
        content: () => <div>
          <p>Sorry, no releases were found at this time.</p>
          <p>You can try using the --prereleases flag to include pre-release versions (WARNING: may contain bugs).</p>
        </div>,
        actions: [() => this.exit('No releases found')],
        button: 'Exit',
      },
      ...config.steps
    ];
    this.state = { 
      config: {},
      showAdvanced: false,
      step: 0,
      ...config
    };
  }
  async componentDidMount() {
    try {
      await this.performStep();
    } catch(e) {
      this.onError(e);
    }
  }
  render() {
    return (
      <div>
        <Breadcrumbs steps={this.state.steps} activeStep={this.state.step} onClose={() => this.exit('User cancelled the install')}/>
        <div className="install-steps-container">
          {this.state.steps.map((s,i) => <StepItem key={i} data={s} isActive={i === this.state.step} />)}
        </div>
      </div>
    );
  }
  async performStep(step = this.state.steps[this.state.step]) {
    if(!step) return this.exit();
    if(step.button) await this.awaitButtonPress();
    if(step.actions) for (const a of step.actions) await a.call(this);
    if(!step.haltOnComplete) {
      this.setState({ step: this.state.step+1 });
      await this.performStep();
    }
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

  async createUser(userData) { 
    const { email, password } = userData;
    const res = await this.post('/registeruser', { email, password }, { handleErrors: false });
    if(res.status === 400) return this.setState({ validationErrors: { superUser: { __errors: [await res.text()] } } });
    if(res.status > 299) throw new Error(await res.text());
  }

  async download() {
    await this.post('/prereq');
    await this.post(`/download?tag=${this.state.selectedRelease}`);
    await this.fetchSchemas();
    await this.generateSecrets();
  }

  async getModules() {
    const dependencies = Object.keys(await (await this.fetch('/modules')).json());
    this.setState({ dependencies });
  }
  
  async downloadModules() {
    if(!this.state?.dependenciesChecked?.length) {
      return;
    }
    return this.post('/installmodules', this.state.dependenciesChecked);
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
    this.setState({ step: releases.length ? 2 : 1 });
    await this.performStep();
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

  async waitForForm() {
    return new Promise(resolve => document.addEventListener('form-submit', () => resolve()));
  }
  
  async saveConfig({ formData }) {
    const res = await this.post('/save', formData);
    this.setState({ rootDir: (await res.json()).rootDir });
  }

  async update() {
    await this.post(`/update?version=${this.state.selectedRelease}`);
  }
  
  async startApp() {
    await this.post('/start');
  }
  
  async getCwd() {
    this.setState({ cmds: (await (await this.fetch('/commands')).json()) });
  }

  async exit(errorMsg) {
    this.post('/exit', errorMsg);
    return window.close();
  }
  
  /**
   * UI actions
   */

  toggleLocalModule(name, checked) {
    const deps = this.state.dependenciesChecked || [];
    if(checked) {
      deps.push(name);
    } else {
      const i = deps.indexOf(name);
      if(i > -1) deps.splice(i, 1);
    }
    this.setState({ dependenciesChecked: deps });
  }

  validateUser({ superUser: { password, confirmPassword } }, errors) {
    if (password !== confirmPassword) {
      errors.superUser.confirmPassword.addError("Passwords don't match");
    }
    return errors;
  }
}