'use strict';

class Install extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      showAdvanced: false,
      step: 1
    };
    this.fetchSchemas();
  }
  render() {
    return (
      <div className="app-inner">
        <div className="breadcrumb-container">
          <ol className="breadcrumb">
            <li className={Utils.getActiveClass(1, this)}>Welcome</li>
            <li className={Utils.getActiveClass(2, this)}>Download</li>
            <li className={Utils.getActiveClass(3, this)}>Configure</li>
            <li className={Utils.getActiveClass(4, this)}>Initialise</li>
            <li className={Utils.getActiveClass(5, this)}>Create user</li>
            <li className={Utils.getActiveClass(6, this)}>Finish</li>
          </ol>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(1, this)}`}>
          <div className="install-step center">
            <div className="step-illustration"> 
              <img src="assets/responsive_blue_alt.png" />
            </div>
            <h2>Welcome to Adapt</h2>
            <p>Thank you for downloading the Adapt authoring tool!</p>
            <p>You are only a few clicks away from building your own multi-device e-learning.</p> 
            <button className="btn btn-info" onClick={this.download.bind(this)}>Start</button>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(2, this)}`}>
          <div className="install-step">
            <h2>Please stand by</h2>
            <p>Downloading the necessary files and installing required dependencies.</p> 
            <p>Please wait patiently, this may take a while!</p> 
            <div className="progress">
              <div className="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style={{width: "100%"}}></div>
            </div>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(3, this)}`}>
          <div className="install-step">
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
        <div className={`install-step-container ${Utils.getActiveClass(4, this)}`}>
          <div className="install-step">
            <h2>Initialising</h2>
            <p>Please wait while the application finishes initialising.</p>
            <div className="progress">
              <div className="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style={{width: "100%"}}></div>
            </div>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(5, this)}`}>
          <div className="install-step">
            <h2>Create a super admin account</h2>
            <p>You now need to create a 'super admin' user which will be used to administer the system</p>
            <div className="alert alert-info"><b>Tip</b>: it is recommended that this account is reserved for admin tasks only, and that you create extra users for daily use via the authoring tool interface.</div>
            <Form key={"user"} id={"user"} schema={this.state.userSchema} showOptional={this.state.showAdvanced} validate={this.validateUser} onSubmit={this.createUser.bind(this)}/>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(6, this)}`}>
          <div className="install-step">
            <h2>Start building with Adapt!</h2>
            <p>Congratulations, your Adapt authoring tool has been installed successfully!</p>
            <p>To start the application, you must run the start script from the source code's root folder:</p>
            <pre>{`cd ${this.state.rootDir} && npm start`}</pre>
            <p>You may now close this window.</p>
          </div>
        </div>
      </div>
    );
  }
  async download() { 
    Utils.showNextStep(this);
    const res = await fetch('/download?prerelease=true', { method: 'POST' });
    if(res.status > 299) return this.handleError(new Error(await res.text()));
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
  }
  async fetchSchemas() {
    try {
      await Promise.all([this.fetchConfigSchemas(), this.fetchUserSchema()]);
    } catch(e) {
      this.handleError(e);
    }
  }
  async fetchConfigSchemas() {
    const configSchemas = await (await fetch(`/schemas/config`)).json();
    const configSchema = { 
      properties: Object.values(configSchemas).reduce((m,s) => Object.assign(m, { [s.name]: { title: s.name, ...s.schema } }), {}) 
    };
    this.setState({ configSchema });
  }
  async fetchUserSchema() {
    try {
      this.setState({ userSchema: await (await fetch(`/schemas/user`)).json() });
    } catch(e) {
      this.handleError(e);
    }
  }
  async saveConfig({ formData }) {
    let res;
    try {
      res = await fetch('/save', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } catch(e) {
      return this.handleError(e);
    }
    Utils.showNextStep(this);
    if(res.status === 500) return this.handleError(new Error(await res.text()));
    this.setState({ rootDir: (await res.json()).rootDir });
    const res2 = await fetch('/start', { method: 'POST' });
    if(res2.status === 500) return this.handleError(new Error(await res2.text()));
    Utils.showNextStep(this);
  }
  validateUser({ superUser: { password, confirmPassword } }, errors) {
    if (password !== confirmPassword) {
      errors.superUser.confirmPassword.addError("Passwords don't match");
    }
    return errors;
  }
  handleError(e) {
    alert(e);
  }
}

async function run() {
  try {
    ReactDOM.render(React.createElement(Install), document.querySelector('#app'));
  } catch(e) {
    console.error(e);
  }
}

run();