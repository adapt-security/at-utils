/**
 * Example config file
 */
const config = component => { 
  /*
   * Note that the config is a function, and is passed the main Installer React component reference to allow dynamic values
   */
  return {
    steps: [
      {
        /*
         * The main title of the step
         */
        title: `Step main title`, 
        /*
         * Step title as rendered in the top breadcrumb bar. If not specified, the main step title is used
         */
        breadcrumb: `Step breadcrumb title`,
        /*
         * Linear icon name. See https://linearicons.com/free
         */
        icon: 'lnr-smile',
        /*
         * Array of functions which are called in order. Once all functions are complete, the next step is shown
         */
        actions: [
          component.myFirstFunction,
          component.mySecondFunction
        ], 
        /*
         * Will show a loading animation (default: false)
         */
        showLoadingBar: true,
        /*
         * The main title of the step
         */
        content: () => <div>HTML goes here</div>,
        /*
         * Instruction text shown at the bottom of the page
         */
        instruction: 'Click the button',
        /*
         * If set, a button will be added with the specified label. 
         * When present, step will not continue until the button is pressed (including if actions are set).
         */
        button: 'Button label'
      }
    ]
  };
};