const config = component => { 
  return {
    steps: [
      {
        title: `You're behind!`,
        breadcrumb: `Confirm`,
        icon: 'lnr-warning',
        content: () => <div>
          <p>You're using <Version version={component.state?.currentRelease}/>, and a newer version of the Adapt authoring tool exists.</p>
          <p>The latest compatible release of the authoring tool has automatically been selected, but you can change this using the below dropdown.</p>
          <ReleaseSelect component={component}/>
        </div>,
        instruction: 'Click the button below to update.',
        button: 'Select'
      },
      {
        title: `Release notes`,
        breadcrumb: `Summary`,
        icon: 'lnr-book',
        content: () => <div><p>See below for release notes on your chosen release.</p><p>Please read these carefully before continuing.</p><ReleaseNotes state={component.state}/></div>,
        button: 'Update'
      },
      {
        title: `Updating`,
        breadcrumb: `Update`,
        icon: 'lnr-hourglass',
        showLoadingBar: true,
        content: () => <p>Your application is being updated to <Version version={component.state?.selectedRelease}/>; this process may take a while.</p>,
        actions: [component.update]
      },
      {
        title: `Update complete!`,
        breadcrumb: `Finish`,
        icon: 'lnr-checkmark-circle',
        content: () => <p>Congratulations, your authoring tool has been successfully updated to <Version version={component.state?.selectedRelease}/>.</p>,
        instruction: 'You may now close this page.',
        button: 'Exit'
      },
    ]
  };
};