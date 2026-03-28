'use strict';

/**
 * Reusable components used in installer pages
 */

function AdaptDependencies(props) {
  if(!props.data) return '';
  const checked = props.checked || [];
  return <div>
    <div className="dependencies">
      {props.data.map((d, i) => <Checkbox key={i} label={d} checked={checked.includes(d)} onChange={e => props.onChange(d, e.target.checked)} />)}
    </div>
    <div className="buttons">
      <button className="btn btn-info select all" onClick={() => props.onChange("all")}>Download all</button>
    </div>
  </div>;
}

function AppStartInstructions(props) {
  if(!props.cmds) return '';
  const { windows, bash } = props.cmds;
  return <div className="start-instructions">
    <p>To start the application, run the following commands in your favourite terminal application:</p>
    {windows ? <div>
      Windows Command Prompt/PowerShell:
      <pre className="left-align">{windows}</pre>
    </div> : ''}
    {windows ? 'Git bash' : 'bash/Mac Terminal'}:
    <pre className="left-align">{bash}</pre>
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
    <Form key={"config"} id={"config"} schema={component.state.configSchema} formData={component.state.config} showOptional={component.state.showAdvanced} onChange={d => component.setState({ config: d.formData })} onSubmit={async d => { await component.saveConfig(d); component.nextStep(); }}/>
  </div>;
}

function DocsLink() {
  return <p>Head over to the <a href="https://adapt-security.github.io/adapt-authoring-documentation/" target="_blank">Project documentation</a> for guides and API docs.</p>;
}

function EmailInput({ component }) {
  return <div>
    <p>Enter the email address for your super admin account. A password will be generated automatically.</p>
    <div className="form-group">
      <label className="control-label" htmlFor="superuser-email">Email address</label>
      <input id="superuser-email" type="email" className="form-control"
        value={component.state.superUserEmail || ''}
        onChange={e => component.setState({ superUserEmail: e.target.value })}
      />
    </div>
    <button className="btn btn-info" style={{marginTop: '10px'}}
      onClick={() => component.nextStep()}
      disabled={!component.state.superUserEmail}>
      Continue
    </button>
  </div>;
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
          {errorLines.map((s,i) => <span key={i}>{s}{i < errorLines.length-1 ? <br/> : ''}</span>)}
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
    try {
      return <JSONSchemaForm.default
        id={this.props.id}
        schema={this.filterOptional()}
        formData={this.props.formData}
        validate={this.props.validate}
        extraErrors={this.props.extraErrors}
        onChange={this.props.onChange || (() => {})}
        onSubmit={this.props.onSubmit}
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

function GeneratedPassword({ password }) {
  if(!password) return null;
  return <div className="user-credentials">
    <p><strong>Your super admin password:</strong></p>
    <pre className="left-align">{password}</pre>
    <p className="instruction">Please save this password. You will be asked to change it on first login.</p>
  </div>;
}

function Instruction(props) {
  return <p className="instruction">{props.text}</p>;
}

function NavButton(props) {
  return <button className="btn btn-info" onClick={props.onClick}>
    {props.label}
  </button>;
}

function ReleaseSelect({ component }) {
  const releases = component.state?.releases || [];
  const selected = component.state?.selectedRelease;
  return <p>
    <select id="release" value={selected} onChange={e => component.setState({ selectedRelease: e.target.value })}>
      {releases.map((r, i) => {
        const bumpLabel = r.bump ? ` (${r.bump})` : '';
        return <option key={i} value={r.tag_name}>{r.name}{bumpLabel} ({new Date(r.date).toDateString()})</option>;
      })}
    </select>
  </p>;
}

function ReleaseNotes({ state: { releases, selectedRelease }}) {
  if(!releases) return '';
  const release = releases.find(r => r.tag_name === selectedRelease)
  return <div className="release-notes">
    {release.bump && <p className="bump-type"><strong>Update type:</strong> {release.bump}</p>}
    {release.bump === 'major' && <div className="alert alert-warning">
      <strong>Warning!</strong> This is a <strong>major</strong> version update which may include breaking changes. Please review the release notes carefully and ensure you have a backup before proceeding.
    </div>}
    <pre className="left-align">{release.body}</pre>
  </div>;
}

function StepItem(props) {
  return <div className={`install-step-container ${props.isActive ? 'active' : ''}`}>
    <div className={`install-step ${props.data.stepAlignment || 'center'}`}>
      {props.data.icon ? <div className="icon"><span className={`lnr ${props.data.icon}`}></span></div> : ''}
      {props.data.title ? <h2>{props.data.title}</h2> : ''}
      {props.data.content ? props.data.content() : ''}
      {props.data.showLoadingBar ?
        <div className="progress">
          <div className="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style={{width: "100%"}}></div>
        </div> : ''}
      {props.data.instruction ? <p className="instruction">{props.data.instruction}</p> : ''}
      {props.data.button ? <NavButton label={props.data.button} onClick={props.onButtonClick} /> : ''}
    </div>
  </div>
}

function Version(props) {
  return <span className="version">{props.version}</span>;
}
