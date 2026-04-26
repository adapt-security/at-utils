const config = component => {
  return {
    action: 'install',
    steps: [
      {
        title: 'Welcome to Adapt',
        breadcrumb: 'Welcome',
        icon: 'lnr-laptop-phone',
        content: () => <div>
          <p>Thank you for downloading the Adapt authoring tool!</p>
          <p>You are only a few clicks away from building your own multi-device e-learning.</p>
          <p><b>Latest version</b>: <Version version={component.state?.newRelease}/></p>
          <ReleaseSelect component={component}/>
        </div>,
        instruction: 'Click the button below to start the download.',
        button: 'Download'
      },
      {
        title: 'Downloading',
        breadcrumb: 'Download',
        icon: 'lnr-cloud-download',
        showLoadingBar: true,
        content: () => <p>Now downloading the necessary files and installing required dependencies. Please wait, this may take a while!</p>,
        actions: [component.download]
      },
      {
        title: 'Configure your environment',
        breadcrumb: 'Configure',
        icon: 'lnr-cog small',
        content: () => <div>
          <p>Configure the settings relevant to your set-up.</p>
          <p><i><b>Note:</b> for convenience, all secrets have been pre-populated with randomly generated values, but feel free to change these to something else.</i></p>
          <ConfigForm component={component} />
        </div>,
        waitForUser: true
      },
      {
        title: 'Create a super admin account',
        breadcrumb: 'Admin',
        icon: 'lnr-user small',
        content: () => <div>
          <EmailInput component={component} />
        </div>,
        actions: [component.createSuperUser, component.getCwd],
        waitForUser: true
      },
      {
        title: 'Start building with Adapt!',
        breadcrumb: 'Finish',
        icon: 'lnr-rocket',
        content: () => <div>
          <p>Congratulations, your Adapt authoring tool has been installed successfully!</p>
          <GeneratedPassword password={component.state.generatedPassword} />
          <AppStartInstructions cmds={component.state.cmds}/>
          <DocsLink />
        </div>,
        instruction: 'Click the button below to close the installer.',
        button: 'Exit'
      }
    ]
  };
};
