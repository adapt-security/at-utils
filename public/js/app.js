'use strict';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { configSchema: props.configSchema };
  }
  render() {
    return <Form schema={this.state.configSchema}/>
  }
}

class Form extends React.Component {
  constructor(props) {
    super(props);
    this.state = { schema: props.schema }
  }
  render() {
    try {
      return <JSONSchemaForm.default schema={this.state.schema} onSubmit={this.onSubmit} onError={this.onError} />
    } catch(e) {
      console.log(e);
    }
  }
  onSubmit() {
    console.log('onSubmit');
  }
  onError() {
    console.log('onError');
  }
}

async function run() {
  try {
    const schemas = await (await fetch('/schemas')).json();
    const configSchema = {
      properties: schemas.reduce((m,s) => {
        return { ...m, [s.name]: { title: s.name, ...s.schema } };
      }, {})
    };
    ReactDOM.render(React.createElement(App, { configSchema }), document.querySelector('#app'));
  } catch(e) {
    console.error(e);
  }
}

run();