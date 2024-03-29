const config = component => { 
  const superUser = {
    email: 'dev@adapt.test',
    password: 'password'
  };
  return {
    steps: [
      {
        title: `Let's code Adapt!`,
        breadcrumb: `Welcome`,
        icon: 'lnr-code',
        content: () => <div>
          <p>This installer will set up a development version of the Adapt authoring tool. <em>This is meant for developers only, here be dragons...</em></p>   
          <ReleaseSelect component={component}/>
        </div>,
        instruction: 'Choose your release and click the button below to start the download.',
        button: `Let's go!`,
      },
      {
        title: `Downloading`,
        breadcrumb: `Download`,
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
        title: `Configure your environment`,
        breadcrumb: `Configure`,
        icon: 'lnr-cog small',
        stepAlignment: 'left',
        content: () => <div>
          <p>Add your configuration settings below. We've added some defaults, but feel free to change these to match your environment.</p> 
          <ConfigForm component={component} />
        </div>,
        actions: [component.waitForForm]
      },
      {
        title: `Download local modules`,
        breadcrumb: `Choose modules`,
        icon: 'lnr-cog',
        content: () => <div>
          <p>At this point you can choose to download any of the Adapt authoring tool modules to work on locally. These will be downloaded to a <em>local_adapt_modules</em> folder in your authoring tool root.</p>
          <p>Please note that for obvious reasons, any modules that you download in this way will need to be updated individually using git.</p>
          <p>To add additional non-core Adapt modules for local development, clone these into the <em>local_adapt_modules</em> and add the local path to the <em>workspaces</em> section of your local <em>package.json</em></p>
          <AdaptDependencies data={component.state.dependencies} checked={component.state.dependenciesChecked} onChange={component.toggleLocalModule.bind(component)}/>
        </div>,
        button: 'Continue'
      },
      {
        title: `Booting up`,
        breadcrumb: `Boot`,
        icon: 'lnr-rocket',
        showLoadingBar: true,
        content: () => <p>Please wait while the application downloads any local modules and starts up.</p>,
        actions: [
          component.downloadModules,
          component.startApp,
          () => component.createUser(superUser),
          component.getCwd
        ]
      },
      {
        title: `Let's get coding!`,
        breadcrumb: 'Finish',
        icon: 'lnr-code',
        content: () => <div>
          <p>Your Adapt authoring tool environment has been set up successfully!</p>
          <p>You can log into the instance with the following credentials:</p>
          <div className="user-credentials">
            <div className="email">{superUser.email}</div>
            <div className="password">{superUser.password}</div>
          </div>
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
        isProduction: false
      },
      'adapt-authoring-logger': {
        levels: ["error", "warn", "success", "info", "debug"]
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