const config = component => {
  return {
    action: 'install',
    superUserEmail: 'dev@adapt.test',
    steps: [
      {
        title: "Let's code Adapt!",
        breadcrumb: 'Welcome',
        icon: 'lnr-code',
        content: () => <div>
          <p>This installer will set up a development version of the Adapt authoring tool. <em>This is meant for developers only, here be dragons...</em></p>
          <ReleaseSelect component={component}/>
        </div>,
        instruction: 'Choose your release and click the button below to start the download.',
        button: "Let's go!",
      },
      {
        title: 'Downloading',
        breadcrumb: 'Download',
        icon: 'lnr-cloud-download',
        showLoadingBar: true,
        content: () => <div>
          <p>Now downloading the necessary files and installing required dependencies.</p>
          <p>Sit tight, this may take a while!</p>
        </div>,
        actions: [
          component.download,
          component.getModules
        ]
      },
      {
        title: 'Configure your environment',
        breadcrumb: 'Configure',
        icon: 'lnr-cog small',
        stepAlignment: 'left',
        content: () => <div>
          <p>Add your configuration settings below. We've added some defaults, but feel free to change these to match your environment.</p>
          <ConfigForm component={component} />
        </div>,
        waitForUser: true
      },
      {
        title: 'Download local modules',
        breadcrumb: 'Choose modules',
        icon: 'lnr-cog',
        content: () => <div>
          <p>Choose any Adapt authoring tool modules to work on locally. These will be downloaded to a <em>local_adapt_modules</em> folder in your authoring tool root.</p>
          <p>To add additional non-core modules for local development, clone them into <em>local_adapt_modules</em> and add the local path to the <em>workspaces</em> section of your local <em>package.json</em>.</p>
          <AdaptDependencies data={component.state.dependencies} checked={component.state.dependenciesChecked} onChange={component.toggleLocalModule.bind(component)}/>
        </div>,
        button: 'Continue'
      },
      {
        title: 'Setting up',
        breadcrumb: 'Setup',
        icon: 'lnr-rocket',
        showLoadingBar: true,
        content: () => <p>Please wait while the application downloads any local modules and completes setup.</p>,
        actions: [
          component.downloadModules,
          component.createSuperUser,
          component.getCwd
        ]
      },
      {
        title: "Let's get coding!",
        breadcrumb: 'Finish',
        icon: 'lnr-code',
        content: () => <div>
          <p>Your Adapt authoring tool environment has been set up successfully!</p>
          <p>You can log in with <strong>{component.state.superUserEmail}</strong> and the following password:</p>
          <GeneratedPassword password={component.state.generatedPassword} />
          <AppStartInstructions cmds={component.state.cmds}/>
          <DocsLink />
        </div>,
        button: 'Exit'
      }
    ],
    config: {
      'adapt-authoring-auth': {
        defaultTokenLifespan: '99y'
      },
      'adapt-authoring-core': {
        isProduction: false,
        logLevels: ['error', 'warn', 'success', 'info', 'debug', 'verbose']
      },
      'adapt-authoring-mongodb': {
        connectionUri: 'mongodb://0.0.0.0/adapt-authoring-dev'
      },
      'adapt-authoring-server': {
        host: 'localhost',
        port: 5678,
        url: 'http://localhost:5678',
        debugRequestTime: true,
        verboseErrorLogging: true
      },
      'adapt-authoring-sessions': {
        lifespan: '99y'
      }
    }
  };
};
