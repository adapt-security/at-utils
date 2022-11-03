const config = component => { 
  return {
    steps: [
      {
        title: `Let's code Adapt!`,
        breadcrumb: `Welcome`,
        icon: 'lnr-keyboard',
        content: () => <div>
          <p>This installer will set up a development version of the Adapt authoring tool. <em>This is meant for developers only, here be dragons...</em></p> 
          <p><b>Latest version</b>: <Version version={component.state?.newRelease} /></p>
        </div>,
        button: 'Start'
      },
      {
        title: `Select version`,
        icon: 'lnr-cloud-download',
        content: () => <ReleaseSelect component={component}/>,
        instruction: 'Click the button below to start the download.',
        button: 'Download',
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
        icon: 'lnr-cog',
        stepAlignment: 'left',
        content: () => <div>
          <p>Add your configuration settings below. We've added some defaults, but feel free to change these to match your environment.</p> 
          <ConfigForm component={component} />
        </div>,
        actions: [component.waitForConfig]
      },
      {
        title: `Initialise local modules`,
        breadcrumb: `Choose modules`,
        icon: 'lnr-cog',
        content: () => <div>
          <p>At this point you can choose to download any of the Adapt authoring tool modules to work on locally. These will be downloaded to a <em>local_modules</em> folder in your authoring tool root.</p>
          <p>Please note that for obvious reasons, any modules that you download in this way will need to be updated individually using git.</p>
          <AdaptDependencies data={component.state.dependencies} checked={component.state.dependenciesChecked} onChange={component.toggleLocalModule.bind(component)}/>
        </div>,
        button: 'Init modules'
      },
      {
        title: `Initialising`,
        breadcrumb: `Initialise`,
        icon: 'lnr-hourglass',
        showLoadingBar: true,
        content: () => <p>Please wait while the application checks your configuration settings and initialises.</p>,
        actions: [component.downloadModules],
      },
      {
        title: `Let's get coding!`,
        icon: 'lnr-rocket',
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