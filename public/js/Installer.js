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
        title: 'Checking releases',
        breadcrumb: false,
        icon: 'lnr-hourglass',
        showLoadingBar: true,
        actions: [this.fetchReleases]
      },
      {
        title: 'No releases found',
        breadcrumb: false,
        icon: `lnr-thumbs-${config.action === 'update' ? 'up' : 'down'}`,
        content: () => <div>
          <p>Sorry, no releases were found at this time.</p>
          <p>You can try using the --prerelease flag to include pre-release versions (WARNING: may contain bugs).</p>
        </div>,
        button: 'Exit',
        onButton: () => this.exit('No releases found')
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
          {this.state.steps.map((s,i) => <StepItem key={i} data={s} isActive={i === this.state.step} onButtonClick={() => this.onStepButton(s)} />)}
        </div>
      </div>
    );
  }

  onStepButton(step) {
    if(step.onButton) {
      step.onButton();
    } else {
      this.nextStep();
    }
  }

  async performStep(step = this.state.steps[this.state.step]) {
    if(!step) return this.exit();
    if(step.button || step.waitForUser) return;
    await this.runActions(step);
    if(!step.haltOnComplete) this.advance();
  }

  async nextStep() {
    await this.runActions(this.state.steps[this.state.step]);
    this.advance();
  }

  advance() {
    this.setState({ step: this.state.step + 1 }, () => this.performStep());
  }

  async runActions(step) {
    if(!step?.actions) return;
    for(const a of step.actions) await a.call(this);
  }

  /**
   * Utilities
   */

  post(url, data = {}, options = {}) {
    return this.apiRequest(url, 'POST', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, options);
  }

  async apiRequest(url, method = 'GET', options = {}) {
    const res = await fetch(url, { ...options, method });
    if(options.handleErrors !== false && res.status > 299) {
      throw new Error(await res.text() ?? res.statusText);
    }
    return res;
  }

  onError(error) {
    document.dispatchEvent(new CustomEvent('error', { detail: error }));
  }

  /**
   * API calls
   */

  async download() {
    await this.post(`/download?tag=${this.state.selectedRelease}`);
    await this.fetchSchemas();
    await this.generateSecrets();
  }

  async fetchReleases() {
    const { currentVersion, releases } = await (await this.apiRequest('/releases')).json();
    const latestRelease = releases.find(r => r.tag_name)?.tag_name;
    this.setState({
      currentRelease: currentVersion,
      newRelease: latestRelease,
      selectedRelease: latestRelease,
      releases
    });
    if(!releases.length) {
      this.setState({ step: 1 });
    } else {
      this.setState({ step: 2 });
    }
    await this.performStep();
  }

  async fetchSchemas() {
    const configSchemas = Object.values(await (await this.apiRequest('/schemas/config')).json());
    this.setState({
      configSchema: { properties: configSchemas.reduce((m,s) => Object.assign(m, { [s.name]: { title: s.name, ...s.schema } }), {}) }
    });
  }

  async generateSecrets() {
    this.setState({ config: { ...this.state.config, ...(await (await this.apiRequest('/secrets')).json()) } });
  }

  async saveConfig({ formData }) {
    const res = await this.post('/save', formData);
    this.setState({ rootDir: (await res.json()).rootDir });
  }

  async createSuperUser() {
    const res = await this.post('/superuser', { email: this.state.superUserEmail });
    const { password } = await res.json();
    this.setState({ generatedPassword: password });
  }

  async update() {
    await this.post(`/update?version=${this.state.selectedRelease}`);
  }

  async getCwd() {
    this.setState({ cmds: (await (await this.apiRequest('/commands')).json()) });
  }

  async exit(errorMsg) {
    await this.post('/exit', errorMsg);
    return window.close();
  }
}
