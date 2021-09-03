'use strict';

class Utils {
  static getActiveClass(id, c) {
    return c.state.step === id ? 'active' : '';
  }
  static showNextStep(c) {
    c ? c.setState({ step: c.state.step+1 }) : this.setState({ step: this.state.step+1 });
  }
}