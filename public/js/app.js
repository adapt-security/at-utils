'use strict';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { ...props, showAdvanced: false };
  }
  render() {
    return [
      <div className="install-step">
        <h2>1. Download application</h2>
        <p>This step will download the source code and local dependencies for the application.</p>
        <p>This process may take a while depending on your PC spec and internet connection.</p>
        <button className="btn btn-info" onClick={this.downloadApp.bind(this)}>Download application</button>
      </div>,
      <div className="install-step">
        <h2>2. Configure your environment</h2>
        <p>You now need to enter the configuration settings relevant to your system.</p> 
        <p>By default, any settings which aren't required or have default values have been hidden. These can be revealed by selecting the checkbox below (<i>not recommended for beginners</i>).</p>
        <button className="btn btn-dark" onClick={this.fetchConfigSchemas.bind(this)}>Get schema</button>
        <label>
          <input type="checkbox" checked={this.state.showAdvanced} onChange={() => this.setState({ showAdvanced: !this.state.showAdvanced })} /> 
          Show advanced settings
        </label>
        <Form liveValidate key={"config"} id={"config"} schema={this.state.configSchema} showOptional={this.state.showAdvanced}/>
      </div>,
      <div className="install-step">
        <h2>3. Create Super admin account</h2>
        <p>You now need to create a 'super admin' user which will be used to administer the system</p>
        <p>It is recommended that this account is reserved for admin tasks only, and that you create extra users for daily use via the authoring tool interface.</p>
        <button className="btn btn-dark" onClick={this.fetchUserSchema.bind(this)}>Get schema</button>
        <Form key={"user"} id={"user"} schema={this.state.userSchema} showOptional={this.state.showAdvanced}/>
      </div>,
      <div className="install-step">
        <h2>4. Start building Adapt!</h2>
        <p>Congratulations, your Adapt authoring tool has been installed successfully!</p>
        <p>To run this install of the authoring tool in the future, you can run the following commands in a terminal:<br/><b>Make sure you also have MongoDB running!</b></p>
        <pre>{`
cd ${this.state.dir}
npm start
`}</pre>
        <p>Click the button below to remove this installer and navigate to your new installation.</p>
        <button className="btn btn-info" onClick={this.cleanUp.bind(this)}>Letsa go!</button>
      </div>
    ]
  }
  async cleanUp() { 
    const cloneRes = await fetch('/cleanup', { method: 'POST' });
    // window.location = ;
  }
  async downloadApp() {
    try {
      const cloneRes = await fetch('/clone', { method: 'POST' });
      const cloneData = await cloneRes.text();
      if(cloneRes.status === 500) throw new Error(cloneData);
      this.setState({ dir: cloneData });

      const npmRes = await fetch('/npmi', { method: 'POST' });
      if(npmRes.status === 500) throw new Error(await npmRes.text());
      
      alert('Application downloaded successfully');
    } catch(e) {
      alert(e);
    }
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
}

class Form extends React.Component {
  constructor(props) {
    super(props);
  }
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
    try {
      return <JSONSchemaForm.default id={this.props.id} schema={this.filterOptional()} onSubmit={this.onSubmit} onError={this.onError} />
    } catch(e) {
      console.log(e);
    }
  }
  onSubmit() {
    console.log('onSubmit', this);
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