'use strict';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      ...props, 
      showAdvanced: false,
      showLoading: true,
      loadingText: 'Loading, please wait',
      step: 1
    };
    this.fetchSchemas();
  }
  render() {
    return (
      <div className="app-inner">
        <div className="breadcrumb-container">
          <ol className="breadcrumb">
            <li className={this.state.step === 1 ? 'active' : ''}>1. Welcome</li>
            <li className={this.state.step === 2 ? 'active' : ''}>2. Configure</li>
            <li className={this.state.step === 3 ? 'active' : ''}>3. Create user</li>
            <li className={this.state.step === 4 ? 'active' : ''}>4. Finish</li>
          </ol>
        </div>
        <div className={`install-step-container ${this.state.step === 1 ? 'active' : ''}`}>
          <div className="install-step center">
            <div className="step-illustration"> 
              <img src="assets/responsive_blue_alt.png" />
            </div>
            <h2>1. Welcome to Adapt!</h2>
            <p>Thank you for downloading the Adapt authoring tool! You are only a few clicks away from building your own multi-device e-learning.</p> 
            <button className="btn btn-info" onClick={this.showNextStep.bind(this)}>Start</button>
          </div>
        </div>
        <div className={`install-step-container ${this.state.step === 2 ? 'active' : ''}`}>
          <div className="install-step">
            <h2>2. Configure your environment</h2>
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
        <div className={`install-step-container ${this.state.step === 3 ? 'active' : ''}`}>
          <div className="install-step">
            <h2>3. Create a super admin account</h2>
            <p>You now need to create a 'super admin' user which will be used to administer the system</p>
            <div className="alert alert-info"><b>Tip</b>: it is recommended that this account is reserved for admin tasks only, and that you create extra users for daily use via the authoring tool interface.</div>
            <Form key={"user"} id={"user"} schema={this.state.userSchema} showOptional={this.state.showAdvanced} validate={this.validateUser} onSubmit={this.createUser.bind(this)}/>
          </div>
        </div>
        <div className={`install-step-container ${this.state.step === 4 ? 'active' : ''}`}>
          <div className="install-step">
            <h2>4. Start building with Adapt!</h2>
            <p>Congratulations, your Adapt authoring tool has been installed successfully!</p>
            <p>To run this install of the authoring tool in the future, you can run the following commands in a terminal:<br/><b>Make sure you also have MongoDB running!</b></p>
            <pre>{`
    cd ${this.state.dir}
    NODE_ENV=production npm start`}</pre>
            <p>Click the button below to close this navigate to your Adapt authoring tool instance.</p>
            <button className="btn btn-info" onClick={this.finish.bind(this)}>Finish</button>
          </div>
        </div>
      </div>
    );
  }
  showNextStep() {
    this.setState({ step: this.state.step+1 });
  }
  async finish() { 
    window.location = 'http://www.adaptlearning.org';
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
    this.showNextStep();
  }
  async fetchSchemas() {
    try {
      Promise.all([this.fetchConfigSchemas(), this.fetchUserSchema()]);
    } catch(e) {
      alert(e);
    }
    Promise.all([this.fetchConfigSchemas(), this.fetchUserSchema()]);
  }
  async fetchConfigSchemas() {
    const configSchemas = await (await fetch(`/schemas/config`)).json();
    const configSchema = { 
      properties: configSchemas.reduce((m,s) => Object.assign(m, { [s.name]: { title: s.name, ...s.schema } }), {}) 
    };
    this.setState({ configSchema });
  }
  async fetchUserSchema() {
    this.setState({ userSchema: await (await fetch(`/schemas/user`)).json() });
  }
  async saveConfig({ formData }) {
    this.showLoading('Saving configuration and starting the application...');
    const res = await fetch('/save', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if(res.status === 500) throw new Error(await res.text());
    const res2 = await fetch('/start', { method: 'POST' });
    if(res2.status === 500) throw new Error(await res2.text());
    this.showNextStep();
  }
  validateUser({ superUser: { password, confirmPassword } }, errors) {
    if (password !== confirmPassword) {
      errors.superUser.confirmPassword.addError("Passwords don't match");
    }
    return errors;
  }
  showLoading(text) {
    this.setState({ showLoading: true, loadingText: text || '' });
  }
  hideLoading() {
    this.setState({ showLoading: false });
  }
}

class Form extends React.Component {
  filterOptional() {
    if(this.props.showOptional) {
      Object.values(this.props.schema.properties).forEach(v => {
        Object.values(v.properties).forEach(v2 => {
          if(Array.isArray(v2.type)) v2.type = v2.type[0];
        });
      });
      return { ...this.props.schema, required: Object.keys(this.props.schema.properties) };
    } 
    const requiredSchema = { type: 'object', properties: {} };
    Object.entries(this.props.schema.properties).reduce((m,[k,v]) => {
      if(v.required) {
        v.required.forEach(r => {
          if(!m[k]) m[k] = { type: 'object', properties: {} };
          m[k].properties[r] = v.properties[r];
          if(Array.isArray(m[k].properties[r].type)) {
            m[k].properties[r].type = m[k].properties[r].type[0];
          }
        });
        m[k].required = v.required;
      }
      return m;
    }, requiredSchema.properties);
    return requiredSchema;
  }
  render() {
    if(!this.props.schema) return '';
    const validate = this.props.validate || undefined;
    try {
      return <JSONSchemaForm.default id={this.props.id} schema={this.filterOptional()} validate={validate} onSubmit={this.props.onSubmit} onError={this.onError} />
    } catch(e) {
      console.log(e);
    }
  }
  onError() {
    alert('There are errors on the page, please check before submitting again');
  }
}

async function run() {
  try {
    ReactDOM.render(React.createElement(App), document.querySelector('#app'));
  } catch(e) {
    console.error(e);
  }
}

run();