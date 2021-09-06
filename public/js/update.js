'use strict';

class Update extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      step: 1, 
      releaseData: { current: {}, latest: {}} };
  }
  render() {
    return (
      <div className="app-inner">
        <div className="breadcrumb-container">
          <ol className="breadcrumb">
            <li className={Utils.getActiveClass(1, this)}>Check</li>
            <li className={Utils.getActiveClass(2, this)}>Confirm</li>
            <li className={Utils.getActiveClass(3, this)}>Update</li>
            <li className={Utils.getActiveClass(4, this)}>Finish</li>
          </ol>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(1, this)}`}>
          <div className="install-step center">
            <div className="step-illustration"> 
              <img src="assets/responsive.png" />
            </div>
            <h2>Get the latest Adapt</h2>
            <p>You're only a few clicks away from getting the latest updates for your Adapt authoring tool install.</p> 
            <button className="btn btn-info" onClick={this.checkForUpdates.bind(this)}>Check for updates</button>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(2, this)}`}>
          <div className="install-step">
            {this.renderUpdateMessage()}
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(3, this)}`}>
          <div className="install-step">
            <h2>Updating</h2>
            <p>Your application is being updated. Please wait.</p> 
            <div className="progress">
              <div className="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style={{width: "100%"}}></div>
            </div>
          </div>
        </div>
        <div className={`install-step-container ${Utils.getActiveClass(4, this)}`}>
          <div className="install-step">
            <h2>Finish</h2>
            <p>Congratulations! Your authoring tool has been successfully updated to <span class="version">{this.state.releaseData.latest && this.state.releaseData.latest.name}</span>.</p>
            <p>You may now close this page.</p>
          </div>
        </div>
      </div>
    );
  }
  async checkForUpdates() {
    const res = await fetch('/getlatest?update=true&prerelease=true', { method: 'POST' });
    if(res.status > 299) {
      return this.handleError(res.statusText);
    }
    try {
      this.setState({ releaseData: await res.json() });
    } catch(e) {}
    Utils.showNextStep(this);
  }
  renderUpdateMessage() { 
    if(!this.state.releaseData.latest) {
      return <div>
        <h2>You're up-to-date</h2>
        <p>You're using <span class="version">{this.state.releaseData.current.version}</span>, which is the latest version!</p>
        <p>There are no updates to apply, so you may now close this window.</p>
      </div>
    }
    return <div>
      <h2>You're behind!</h2>
      <p>A newer version of the Adapt authoring tool exists.</p>
      <p>You're using <span class="version">{this.state.releaseData.current.version}</span>. The latest version <span class="version">{this.state.releaseData.latest.name}</span> was released on {new Date(this.state.releaseData.latest.date).toDateString()}.</p>
      <p>Click the button below to update.</p>
      <button className="btn btn-info" onClick={this.performUpdate.bind(this)}>Update</button>
    </div>
  }
  async performUpdate() {
    Utils.showNextStep(this);
    const res = await fetch(`/update?version=${this.state.releaseData.latest.name}`, { method: 'POST' });
    if(res.status > 299) return this.handleError(res.statusText);
    Utils.showNextStep(this);
  }
  handleError(e) {
    alert(e);
  }
}

async function run() {
  try {
    ReactDOM.render(React.createElement(Update), document.querySelector('#app'));
  } catch(e) {
    console.error(e);
  }
}

run();