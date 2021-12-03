'use strict';

class Install extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      showAdvanced: false,
      step: 0
    };
    this.fetchReleases();
  }
  render() {
    const latestRelease = this.state.newRelease || '';
    const releases = this.state.releases || [];
    return (
      <div>
        <div className="breadcrumb-container">
          <ol className="breadcrumb">
            <li className={Utils.getActiveClass(1, this)}>Welcome</li>
            <li className={Utils.getActiveClass(2, this)}>Select version</li>
            <li className={Utils.getActiveClass(3, this)}>Download</li>
            <li className={Utils.getActiveClass(4, this)}>Configure</li>
            <li className={Utils.getActiveClass(5, this)}>Initialise</li>
            <li className={Utils.getActiveClass(6, this)}>Create user</li>
            <li className={Utils.getActiveClass(7, this)}>Finish</li>
          </ol>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(1, this)}`}>
          <div className="install-step center">
            <div className="step-illustration"> 
              <img src="assets/responsive.png" />
            </div>
            <h2>Welcome to Adapt</h2>
            <p>Thank you for downloading the Adapt authoring tool!</p>
            <p>You are only a few clicks away from building your own multi-device e-learning.</p> 
            <p><b>Latest version</b>: {Utils.wrapVersion(latestRelease)}</p> 
            <button className="btn btn-info" onClick={() => this.setState({ step: this.state.step+1 })}>Start</button>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(2, this)}`}>
          <div className="install-step">
            <div class="icon"><span class="lnr lnr-cloud-download"></span></div>
            <h2>Select version</h2>
            <p>The latest release is {Utils.wrapVersion(latestRelease)}, and is the version we recommend you download, but you can select another using the dropdown below.</p>
            <p>{Utils.renderReleaseSelect.call(this, releases, latestRelease)}</p>
            <p>Click the button below to start the download.</p>
            <button className="btn btn-info" onClick={this.download.bind(this)}>Download</button>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(3, this)}`}>
          <div className="install-step">
            <div class="icon"><span class="lnr lnr-cloud-download"></span></div>
            <h2>Downloading</h2>
            <p>Now downloading the necessary files and installing required dependencies. Please wait, this may take a while!</p> 
            <div className="progress">
              <div className="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style={{width: "100%"}}></div>
            </div>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(4, this)}`}>
          <div className="install-step">
          <div class="icon small"><span class="lnr lnr-cog"></span></div>
            <h2>Configure your environment</h2>
            <p>The first step is to configure the configuration settings relevant to your set-up.</p> 
            <div className="alert alert-info"><b>Tip</b>: any settings which aren't required or have default values have been hidden. These can be revealed by selecting the checkbox below (<i>not recommended for beginners</i>).</div>
            <div className="checkbox">
              <label className="control-label">
                <input type="checkbox" checked={this.state.showAdvanced} onChange={() => this.setState({ showAdvanced: !this.state.showAdvanced })} /> 
                Show advanced settings
              </label>
            </div>
            <Form key={"config"} id={"config"} schema={this.state.configSchema} showOptional={this.state.showAdvanced} onSubmit={this.saveConfig.bind(this)}/>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(5, this)}`}>
          <div className="install-step">
            <div class="icon"><span class="lnr lnr-hourglass"></span></div>
            <h2>Initialising</h2>
            <p>Please wait while the application checks your configuration settings and initialises.</p>
            <div className="progress">
              <div className="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style={{width: "100%"}}></div>
            </div>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(6, this)}`}>
          <div className="install-step">
            <div class="icon small"><span class="lnr lnr-user"></span></div>
            <h2>Create a super admin account</h2>
            <p>You now need to create a 'super admin' user which will be used to administer the system</p>
            <div className="alert alert-info"><b>Tip</b>: it is recommended that this account is reserved for admin tasks only, and that you create extra users for daily use via the authoring tool interface.</div>
            <Form key={"user"} id={"user"} schema={this.state.userSchema} showOptional={this.state.showAdvanced} validate={this.validateUser} onSubmit={this.createUser.bind(this)}/>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(7, this)}`}>
          <div className="install-step">
            <div class="icon"><span class="lnr lnr-rocket"></span></div>
            <h2>Start building with Adapt!</h2>
            <p>Congratulations, your Adapt authoring tool has been installed successfully!</p>
            <p>To start the application, you must run the start script from the source code's root folder:</p>
            <pre>{`cd ${this.state.rootDir} && npm start`}</pre>
            <p class="instruction">You may now close this window.</p>
          </div>
        </div>
        {this.state.error ? this.state.error : ''}
      </div>
    );
  }
  async fetchReleases() { 
    const res = await fetch('/releases', { method: 'GET' });
    if(res.status > 299) {
      return Utils.handleError(this, res.statusText);
    }
    try {
      const { currentVersion, releases } = await res.json();
      this.setState({ 
        currentRelease: currentVersion, 
        newRelease: releases.find(r => r.url)?.tag_name,
        releases, 
        step: 1
      });
      if(!releases.length) throw new Error('No releases were found!\nYou can try including the --prereleases flag to install a pre-release version (caution: may contain bugs).');
    } catch(e) {
      return Utils.handleError(this, e.message);
    }
  }
  async download() { 
    Utils.showNextStep(this);

    const res = await fetch('/prereq', { method: 'POST' });

    if(res.status > 299) {
      return Utils.handleError(this, await res.text());
    }
    const res2 = await fetch('/download', { method: 'POST' });
    if(res2.status > 299) return Utils.handleError(this, new Error(await res2.text()));
    
    await this.fetchSchemas();

    Utils.showNextStep(this);
  }
  async createUser({ formData }) { 
    const res = await fetch('/registeruser', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: formData.superUser.email, 
        password: formData.superUser.password 
      })
    });
    if(res.status === 500) throw new Error(await res.text());
    Utils.showNextStep(this);
    const res2 = await fetch('/exit', { method: 'POST' });
    if(res2.status === 500) return Utils.handleError(this, await res2.text());
  }
  async fetchSchemas() {
    try {
      await Promise.all([this.fetchConfigSchemas(), this.fetchUserSchema()]);
    } catch(e) {
      Utils.handleError(this, e);
    }
  }
  async fetchConfigSchemas() {
    const res = await fetch(`/schemas/config`);
    if(res.status === 500) throw new Error(await res.text());
    const configSchema = { 
      properties: Object.values(await res.json()).reduce((m,s) => Object.assign(m, { [s.name]: { title: s.name, ...s.schema } }), {}) 
    };
    this.setState({ configSchema });
  }
  async fetchUserSchema() {
    const res = await fetch(`/schemas/user`);
    if(res.status === 500) throw new Error(await res.text());
    this.setState({ userSchema: await res.json() });
  }
  async saveConfig({ formData }) {
    const res = await fetch('/save', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if(res.status === 500) {
      return Utils.handleError(this, new Error(await res.text()));
    }
    Utils.showNextStep(this);
    if(res.status === 500) return Utils.handleError(this, await res.text());
    this.setState({ rootDir: (await res.json()).rootDir });
    const res2 = await fetch('/start', { method: 'POST' });
    if(res2.status === 500) return Utils.handleError(this, await res2.text());
    Utils.showNextStep(this);
  }
  validateUser({ superUser: { password, confirmPassword } }, errors) {
    if (password !== confirmPassword) {
      errors.superUser.confirmPassword.addError("Passwords don't match");
    }
    return errors;
  }
}

async function run() {
  try {
    ReactDOM.render(React.createElement(Install), document.querySelector('#content'));
  } catch(e) {
    console.error(e);
  }
}

run();