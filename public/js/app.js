'use strict';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { ...props, showAdvanced: false };
    this.fetchSchemas();
  }
  render() {
    return (
      <div className="app-inner">
        <ol className="breadcrumb">
          <li className="active">1. Welcome</li>
          <li>2. Configure</li>
          <li>3. Create user</li>
          <li>4. Finish</li>
        </ol>
        <div className={"loading" + (!this.state.showLoading ? " hide" : "")}>
          <div className="text">{this.state.loadingText}</div>
          <div className="progress">
            <div className="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style={{width: "100%"}}></div>
          </div>
        </div>
        <div className="install-step">
          <h2>1. Welcome to Adapt!</h2>
          <p>You now need to enter the configuration settings relevant to your set-up.</p> 
          <button className="btn btn-info">Next</button>
        </div>
        <div className="install-step">
          <h2>2. Configure your environment</h2>
          <p>You now need to enter the configuration settings relevant to your set-up.</p> 
          <p>Any settings which aren't required or have default values have been hidden. These can be revealed by selecting the checkbox below (<i>not recommended for beginners</i>).</p>
          <div className="checkbox">
            <label className="control-label">
              <input type="checkbox" checked={this.state.showAdvanced} onChange={() => this.setState({ showAdvanced: !this.state.showAdvanced })} /> 
              Show advanced settings
            </label>
          </div>
          <Form key={"config"} id={"config"} schema={this.state.configSchema} showOptional={this.state.showAdvanced} onSubmit={this.saveConfig.bind(this)}/>
        </div>
        <div className="install-step">
          <h2>3. Create a super admin account</h2>
          <p>You now need to create a 'super admin' user which will be used to administer the system</p>
          <p>It is recommended that this account is reserved for admin tasks only, and that you create extra users for daily use via the authoring tool interface.</p>
          <Form key={"user"} id={"user"} schema={this.state.userSchema} showOptional={this.state.showAdvanced} validate={this.validateUser} onSubmit={this.createUser.bind(this)}/>
        </div>
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
    );
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
    alert('Super admin user created successfully');
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
    this.hideLoading();
    alert('Configuration has been set, and application started');
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