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
        content: () => <div>
          <p>Add your configuration settings below. We've added some defaults, but feel free to change these to match your environment.</p> 
          <Checkbox label="Show advanced settings" checked={component.state?.showAdvanced} onChange={() => component.setState({ showAdvanced: !component.state?.showAdvanced })} />
          <Form key={"config"} id={"config"} schema={component.state?.configSchema} formData={component.state?.config} showOptional={component.state?.showAdvanced} onSubmit={component.saveConfig.bind(component)}/>
        </div>
      },
      {
        title: `Initialise local modules`,
        breadcrumb: `Choose modules`,
        icon: 'lnr-cog',
        content: () => <div>
          <p>At this point you can choose to download any of the Adapt authoring tool modules to work on locally. These will be downloaded to a <em>local_modules</em> folder in your authoring tool root.</p>
          <p>Please note that for obvious reasons, any modules that you download in this way will need to be updated individually using git.</p>
          {component.state?.dependencies?.map((d, i) => <Checkbox key={i} label={d} onChange={e => component.toggleLocalModule(d, e.target.checked)} />)}
        </div>,
        actions: [component.downloadModules],
        button: 'Init modules'
      },
      {
        title: `Initialising`,
        breadcrumb: `Initialise`,
        icon: 'lnr-hourglass',
        showLoadingBar: true,
        content: () => <p>Please wait while the application checks your configuration settings and initialises.</p>
      },
      {
        title: `Let's get coding!`,
        icon: 'lnr-rocket',
        content: () => <div>
          <p>Your Adapt authoring tool environment has been set up successfully!</p>
          <p>You can start the application with:</p>
          <pre>{`cd ${component.state?.rootDir} && npm start`}</pre>
        </div>,
        instruction: 'You may now close this window.',
        breadcrumb: 'Finish'
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