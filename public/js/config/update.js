const config = component => {
  return {
    action: 'update',
    steps: [
      {
        title: "You're behind!",
        breadcrumb: 'Confirm',
        icon: 'lnr-warning',
        content: () => <div>
          <p>You're using <Version version={component.state?.currentRelease}/>, and a newer version of the Adapt authoring tool exists.</p>
          <p>The latest compatible release has been selected, but you can change this using the dropdown below.</p>
          <ReleaseSelect component={component}/>
          <ReleaseNotes state={component.state}/>
        </div>,
        instruction: 'Click the button below to update.',
        button: 'Update'
      },
      {
        title: 'Updating',
        breadcrumb: 'Update',
        icon: 'lnr-hourglass',
        showLoadingBar: true,
        content: () => <p>Your application is being updated to <Version version={component.state?.selectedRelease}/>; this process may take a while.</p>,
        actions: [component.update]
      },
      {
        title: 'Update complete!',
        breadcrumb: 'Finish',
        icon: 'lnr-checkmark-circle',
        content: () => <p>Congratulations, your authoring tool has been successfully updated to <Version version={component.state?.selectedRelease}/>.</p>,
        instruction: 'You may now close this page.',
        button: 'Exit'
      }
    ]
  };
};
