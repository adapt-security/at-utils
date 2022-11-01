const config = component => { 
  return {
    steps: [
      {
        title: `Get the latest Adapt`,
        breadcrumb: `Check`,
        icon: 'lnr-laptop-phone',
        button: {
          text: 'Check for updates',
          clickHandler: component.showNextStep.bind(component)
        },
        content: () => <p>You're only a few clicks away from getting the latest updates for your Adapt authoring tool install.</p> 
      },
      {
        title: `Nothing to do!`,
        icon: 'lnr-checkmark-circle',
        content: () => <p>There are no updates to apply; you're using <Version version={component.state?.currentRelease}/>, which is the latest version!</p>,
        instruction: "You may now close this window."
      },
      {
        title: `You're behind!`,
        breadcrumb: `Confirm`,
        icon: 'lnr-warning',
        button: {
          text: 'Update',
          clickHandler: component.update.bind(component)
        },
        content: () => <div>
          <p>You're using <Version version={component.state?.currentRelease}/>, and a newer version of the Adapt authoring tool exists.</p>
          <p>The latest compatible release of the authoring tool has automatically been selected, but you can change this using the below dropdown.</p>
          <ReleaseSelect component={component}/>
        </div>,
        instruction: 'Click the button below to update.'
      },
      {
        title: `Updating`,
        breadcrumb: `Update`,
        icon: 'lnr-hourglass',
        showProgressBar: true,
        content: () => <p>Your application is being updated to <Version version={component.state?.newRelease}/>; this process may take a while.</p> 
      },
      {
        title: `Update complete!`,
        breadcrumb: `Finish`,
        icon: 'lnr-checkmark-circle',
        content: () => <p>Congratulations, your authoring tool has been successfully updated to <Version version={component.state?.newRelease}/>.</p>,
        instruction: 'You may now close this page.'
      },
    ]
  };
};