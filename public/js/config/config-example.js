/**
 * Example config file
 *
 * The config is a function passed the main Installer React component reference,
 * allowing dynamic values via component.state.
 */
const config = component => {
  return {
    steps: [
      {
        /** The main title of the step */
        title: 'Step title',
        /** Title as rendered in the top breadcrumb bar (defaults to title) */
        breadcrumb: 'Breadcrumb title',
        /** Linear icon name. See https://linearicons.com/free */
        icon: 'lnr-smile',
        /** Main HTML content */
        content: () => <div>HTML goes here</div>,
        /** Instruction text shown at the bottom of the page */
        instruction: 'Click the button',
        /**
         * Array of async functions called in order.
         * Once all resolve, the next step is shown (unless button or waitForUser is set).
         */
        actions: [
          component.myFirstFunction,
          component.mySecondFunction
        ],
        /** Shows a loading animation (default: false) */
        showLoadingBar: true,
        /**
         * If set, a button is shown with this label.
         * Step will not auto-advance; the button advances to the next step.
         */
        button: 'Button label',
        /**
         * If true, step will not auto-advance.
         * Use this for steps where a form or custom UI calls component.nextStep().
         */
        waitForUser: true,
        /**
         * Custom handler for the button click (overrides default nextStep behaviour).
         */
        onButton: () => component.exit('User chose to exit')
      }
    ]
  };
};
