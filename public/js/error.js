'use strict';

class ErrorDisplay extends React.Component {
  render() {
    return <div class='install-step-container active error'>
      <div class="install-step">
        <div class="icon"><span class="lnr lnr-sad"></span></div>
        <h2>Something went wrong</h2>
        <p>An error occurred, see below for more information.</p>
        <p class="message">{this.props}</p>
        <p class="instruction">You can safely close this window.</p>
      </div>
    </div>
  }
}