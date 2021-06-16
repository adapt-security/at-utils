'use strict';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { ...props, showAdvanced: false };
  }
  render() {
    return [
      <div>
        <h2>1. Download application</h2>
        <p>This step will download the source code and local dependencies for the application.</p>
        <p>This process may take a while depending on your PC spec and internet connection.</p>
        <button onClick={this.downloadApp.bind(this)}>Download application</button>
      </div>,
      <div>
        <h2>2. Configure your environment</h2>
        <p>You now need to enter the configuration settings relevant to your system.</p> 
        <p>By default, any settings which aren't required or have default values have been hidden. These can be revealed by selecting the checkbox.</p>
        <button onClick={this.fetchConfigSchemas.bind(this)}>Get schema</button>
        <label>
          <input type="checkbox" checked={this.state.showAdvanced} onChange={() => this.setState({ showAdvanced: !this.state.showAdvanced })} /> 
          Show advanced settings
        </label>
        <Form key={"config"} id={"config"} schema={this.state.configSchema} showOptional={this.state.showAdvanced}/>
      </div>,
      <div>
        <h2>3. Create Super admin account</h2>
        <p>You now need to create a 'super admin' user which will be used to administer the system</p>
        <p>It is recommended that this account is reserved for admin tasks only, and that you create extra users for daily use via the authoring tool interface.</p>
        <button onClick={this.fetchUserSchema.bind(this)}>Get schema</button>
        <Form key={"user"} id={"user"} schema={this.state.userSchema} showOptional={this.state.showAdvanced}/>
      </div>,
      <div>
        <h2>4. Start building Adapt!</h2>
        <p>Your Adapt authoring tool has been installed successfully! Click the button below to close the installer and navigate to your new installation.</p>
        <pre>{`
cd ${this.state.dir}
npm start
        `}</pre>
        <button>Go!</button>
      </div>
    ]
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
      return this.props.schema;
    } 
    if(!this.props.schema.properties) {
      return {};
    }
    const optionalSchema = { type: 'object', properties: {} };
    Object.entries(this.props.schema.properties).reduce((m,[k,v]) => {
      if(v.required) {
        v.required.forEach(r => {
          if(!m[k]) m[k] = { type: 'object', properties: {} };
          m[k].properties[r] = v.properties[r];
          if(Array.isArray(m[k].properties[r].type)) {
            m[k].properties[r].type = m[k].properties[r].type[0];
          }
        });
      }
      return m;
    }, optionalSchema.properties);
    return optionalSchema;
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
    console.log('onError');
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