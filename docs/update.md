# Updating

Getting the latest version of the Adapt authoring tool is as simple as running the following command in a terminal:

```
npx adapt-security/at-utils update [DIRECTORY]
```

The update utility accepts the same parameters and flags as the installer, so see the [installation instructions](http://localhost:9003/#/install?id=installer-options) for information.

> #### Updating a dev install
>
> If you installed the application with the `--dev` flag, make sure you also add this flag when updating. Otherwise your local modules won't be included and will need to be re-linked in your `package.json` manually.