const config = component => { 
  return {
    steps: [
      {
        title: `Welcome to Adapt`,
        breadcrumb: `Welcome`,
        icon: 'lnr-laptop-phone',
        button: {
          text: 'Start',
          clickHandler: component.showNextStep.bind(component)
        },
        content: () => <div>
          <p>Thank you for downloading the Adapt authoring tool!</p>
          <p>You are only a few clicks away from building your own multi-device e-learning.</p> 
          <p><b>Latest version</b>: <Version version={component.state?.newRelease}/></p> 
        </div>
      },
      {
        title: `Select version`,
        icon: 'lnr-cloud-download',
        button: {
          text: 'Download',
          clickHandler: component.download.bind(component)
        },
        content: () => <div>
          <p>The latest release is <Version version={component.state?.newRelease}/>, and is the version we recommend you download, but you can select another using the dropdown below.</p>
          <ReleaseSelect component={component}/>
        </div>,
        instruction: 'Click the button below to start the download.'
      },
      {
        title: `Downloading`,
        breadcrumb: `Download`,
        icon: 'lnr-cloud-download',
        showLoadingBar: true,
        content: () => <p>Now downloading the necessary files and installing required dependencies. Please wait, component may take a while!</p> 
      },
      {
        title: `Configure your environment`,
        breadcrumb: `Configure`,
        icon: 'lnr-cog small',
        content: () => <div>
          <p>The first step is to configure the configuration settings relevant to your set-up.</p> 
          <p><i><b>Note:</b> for convenience, all secrets have been pre-populated with randomly generated values, but feel free to change these to something else.</i></p>
          <div className="alert alert-info"><b>Tip</b>: any settings which aren't required or have default values have been hidden. These can be revealed by selecting the checkbox below (<i>not recommended for beginners</i>).</div>
          <Checkbox label="Show advanced settings" checked={component.state.showAdvanced} onChange={() => component.setState({ showAdvanced: !component.state.showAdvanced })}/>
          <Form key={"config"} id={"config"} schema={component.state.configSchema} formData={component.state.config} showOptional={component.state.showAdvanced} onSubmit={component.saveConfig.bind(component)}/>
        </div>
      },
      {
        title: `Initialising`,
        breadcrumb: `Initialise`,
        icon: 'lnr-hourglass',
        showLoadingBar: true,
        content: () => <p>Please wait while the application checks your configuration settings and initialises.</p>
      },
      {
        title: `Create a super admin account`,
        breadcrumb: `Configure`,
        icon: 'lnr-user small',
        content: () => <div>
          <p>You now need to create a 'super admin' user which will be used to administer the system</p>
          <div className="alert alert-info"><b>Tip</b>: it is recommended that component account is reserved for admin tasks only, and that you create extra users for daily use via the authoring tool interface.</div>
          <Form key={"user"} id={"user"} schema={component.state.userSchema} showOptional={component.state.showAdvanced} validate={component.validateUser} extraErrors={component.state.validationErrors} onSubmit={component.createUser.bind(component)}/>
        </div>
      },
      {
        title: `Start building with Adapt!`,
        breadcrumb: `Finish`,
        icon: 'lnr-rocket',
        content: () => <div>
          <p>Congratulations, your Adapt authoring tool has been installed successfully!</p>
          <AppStartInstructions dirs={component.state.cmds}/>
        </div>,
        instruction: 'You may now close component window.'
      }
    ],
  };
};