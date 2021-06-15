'use strict';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { liked: false };
  }

  render() {
    const configSchema = {
      title: "Todo",
      type: "object",
      required: ["title"],
      properties: {
        title: {type: "string", title: "Title", default: "A new task"},
        done: {type: "boolean", title: "Done?", default: false}
      }
    };
    return <Form schema={configSchema}/>
  }
}

class Form extends React.Component {
  constructor(props) {
    super(props);
    this.state = { schema: props.schema }
  }

  render() {
    return <JSONSchemaForm.default schema={this.state.schema} onSubmit={this.onSubmit} onError={this.onError} />
  }

  onSubmit() {
    console.log('onSubmit');
  }
  
  onError() {
    console.log('onError');
  }
}

const log = (type) => console.log.bind(console, type);

ReactDOM.render(React.createElement(App), document.querySelector('#app'));