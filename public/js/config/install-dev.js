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
        icon: 'lnr-keyboard',
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
        actions: [component.waitForConfig]
      },
      {
        title: `Download local modules`,
        breadcrumb: `Choose modules`,
        icon: 'lnr-cog',
        content: () => <div>
          <p>At this point you can choose to download any of the Adapt authoring tool modules to work on locally. These will be downloaded to a <em>local_adapt_modules</em> folder in your authoring tool root.</p>
          <p>Please note that for obvious reasons, any modules that you download in this way will need to be updated individually using git.</p>
          <AdaptDependencies data={component.state.dependencies} checked={component.state.dependenciesChecked} onChange={component.toggleLocalModule.bind(component)}/>
        </div>,
        button: 'Continue'
      },
      {
        title: `Booting up`,
        breadcrumb: `Initialise`,
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
        icon: 'lnr-code',
        content: () => <div>
          <p>Your Adapt authoring tool environment has been set up successfully!</p>
          <AppStartInstructions cmds={component.state.cmds}/>
          <p>Head over to the <a href="https://adapt-security.github.io/adapt-authoring-documentation/" target="_blank">Project documentation</a> for guides and API docs.</p>
        </div>,
        breadcrumb: 'Finish',
        button: 'Exit'
      }
    ],
    config: {
      'adapt-authoring-core': {
        isProduction: false
      },
      'adapt-authoring-mongodb': {
        levels: ["error", "warn", "success", "info", "debug"]
      },
      'adapt-authoring-mongodb': {
        connectionUri: 'mongodb://localhost/adapt-authoring-dev'
      },
      'adapt-authoring-server': {
        host: 'localhost',
        port: 5678,
        url: 'http://localhost:5678',
        debugRequestTime: true,
        logStackOnError: true
      }
    }
  };
};