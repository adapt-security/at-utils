'use strict';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { ...props, showAdvanced: false };
  }
  render() {
    return [
      <label>
        <input type="checkbox" checked={this.state.showAdvanced} onChange={() => this.setState({ showAdvanced: !this.state.showAdvanced })} /> 
        Show advanced settings
      </label>,
      <Form key={"config"} id={"config"} schema={this.state.configSchema} showOptional={this.state.showAdvanced}/>,
      <Form key={"user"} id={"user"} schema={this.state.userSchema} showOptional={this.state.showAdvanced}/>
    ]
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
    const [configSchemas, userSchema] = await Promise.all([
      (await fetch('/schemas/config')).json(),
      (await fetch('/schemas/user')).json()
    ]);
    const configSchema = {
      properties: configSchemas.reduce((m,s) => {
        return { ...m, [s.name]: { title: s.name, ...s.schema } };
      }, {})
    };
    ReactDOM.render(React.createElement(App, { configSchema, userSchema }), document.querySelector('#app'));
  } catch(e) {
    console.error(e);
  }
}

run();