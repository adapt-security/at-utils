'use strict';

/**
 * Reusable components used in installer pages
 */

function AdaptDependencies(props) {
  if(!props.data) return '';
  const checked = props.checked || [];
  return <div className="dependencies">
    {props.data.map((d, i) => <Checkbox key={i} label={d} checked={checked.includes(d)} onChange={e => props.onChange(d, e.target.checked)} />)}
  </div>;
}

function AppStartInstructions(props) {
  if(!props.cmds) {
    return '';
  }
  const { windows, bash } = props.cmds;
  return <div className="start-instructions">
    <p>To start the application, run the following commands in your favourite terminal application:</p>
    {windows ? <div>
      Windows Command Prompt/PowerShell:
      <pre className="command">{windows}</pre>
    </div> : ''}
    {windows ? 'Git bash' : 'bash/Mac Terminal'}:
    <pre className="command">{bash}</pre>
  </div>;
}

function Breadcrumbs(props) {
  return <div className="breadcrumb-container">
    <ol className="breadcrumb">
      {props.steps
        .map((s, i) => {
          const activeClass = i === props.activeStep ? 'active' : '';
          const hiddenClass = s.breadcrumb === false ? 'hidden' : '';
          return <li key={i} className={`${activeClass} ${hiddenClass}`}>{s.breadcrumb || s.title}</li>;
        })}
        <button className="close" onClick={props.onClose}><span className="text">Close installer</span><span className="icon"><span className="lnr lnr-cross"></span></span></button>
    </ol>
  </div>
}

function Checkbox(props) {
  return <div className={`checkbox ${props.checked ? 'checked' : ''}`}>
    <label className="control-label">
      <input type="checkbox" checked={props.checked} onChange={props.onChange} /> 
      {props.label}
    </label>
  </div>
}

function ConfigForm(props) {
  const component = props.component;
  return <div>
    <div className="alert alert-info"><b>Tip</b>: any settings which aren't required or have default values have been hidden. These can be revealed by selecting the checkbox below (<i>not recommended for beginners</i>).</div>
    <Checkbox label="Show advanced settings" checked={component.state.showAdvanced} onChange={() => component.setState({ showAdvanced: !component.state.showAdvanced })}/>
    <Form key={"config"} id={"config"} schema={component.state.configSchema} formData={component.state.config} showOptional={component.state.showAdvanced} onSubmit={component.saveConfig.bind(component)}/>
  </div>;
}

function DocsLink() {
  return <p>Head over to the <a href="https://adapt-security.github.io/adapt-authoring-documentation/" target="_blank">Project documentation</a> for guides and API docs.</p>;
}

function ErrorDisplay(e) {
  console.error(e);
  const message = e.message ? e.message : e.toString ? e.toString() : e;
  const errorLines = message.split('\n');
  return <div className="inner">
    <div className='install-step-container active error'>
      <div className="install-step">
        <div className="icon"><span className="lnr lnr-sad"></span></div>
        <h2>Something went wrong</h2>
        <p>An error occurred, see below for more information.</p>
        <p className="message">
          {errorLines.map((s,i) => <span>{s}{i < errorLines.length-1 ? <br/> : ''}</span>)}
        </p>
        <p className="instruction">You can safely close this window.</p>
      </div>
    </div>
  </div>
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
    if(!this.props.schema) return null;
    const validate = this.props.validate || undefined;
    try {
      return <JSONSchemaForm.default 
        id={this.props.id} 
        schema={this.filterOptional()} 
        formData={this.props.formData} 
        validate={validate} 
        extraErrors={this.props.extraErrors} 
        onSubmit={(...args) => document.dispatchEvent(new Event('form-submit')) && this.props.onSubmit(...args)} 
        onError={this.onError} />
    } catch(e) {
      console.error(e);
      return null;
    }
  }
  onError() {
    alert('There are errors on the page, please check before submitting again');
  }
}

function Instruction(props) {
  return <p className="instruction">{props.text}</p>;
}

function ReleaseSelect({ component }) {
  const releases = component.state?.releases || [];
  const selected = component.state?.latestRelease;
  return <p>
    <select id="release" value={selected} onChange={e => component.setState({ selectedRelease: e.target.value })}>
      {releases.map((r, i) => <option key={i} value={r.tag_name}>{r.name} ({new Date(r.date).toDateString()})</option>)}
    </select>
  </p>;
}

function StepItem(props) {
  return <div className={`install-step-container ${props.isActive ? 'active' : ''}`}>
    <div className={`install-step ${props.stepAlignment || 'center'}`}>
      {props.data.icon ? 
        <div className="icon">
          <span className={`lnr ${props.data.icon}`}></span>
        </div> : ''}
      <h2>{props.data.title}</h2>
      {props.data.content()}
      {props.data.showLoadingBar ? 
        <div className="progress">
          <div className="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style={{width: "100%"}}></div>
        </div> : ''}
      {props.data.instruction ? <p className="instruction">{props.data.instruction}</p> : ''}
      {props.data.button ? 
        <button className="btn btn-info" onClick={() => document.dispatchEvent(new Event('click-button'))}>
          {props.data.button}
        </button> : ''}
    </div>
  </div>
}

function Version(props) {
  return <span className="version">{props.version}</span>;
}