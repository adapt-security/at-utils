# Installation

This page outlines the various ways to install the authoring tool depending on your needs. Use the quick links below to jump to your section of interest.

> #### Important note on installing before the v1.0.0 stable release
> While the authoring tool v1.0.0 is in prerelease, you must pass the `--prerelease` flag or the installer will fail

- [Prerequisites](#prerequisites)
- [Standard installation](#standard-installation)
- [Headless (server) installation](#headless-installation)
- [Developer installation](#developer-installation)

## Prerequisites

Regardless of which installation method you choose, the Adapt authoring tool has a number of prerequisites which will need to be installed up-front.

- [git {{{git}}}](https://git-scm.com/downloads): for getting the latest code changes
- [MongoDB 4+](https://www.mongodb.com/try/download/community): for storing all of your data
- [Node.js {{{node}}}](https://nodejs.org/en/download/): for running the code
- [npm {{{npm}}}](https://nodejs.org/en/download/): for managing dependencies

> We strongly recommend using a version manager to install Node.js and npm like [nvm](https://github.com/nvm-sh/nvm) (Linux/Mac OS) or [nvm-windows](https://github.com/coreybutler/nvm-windows) (Windows). This makes it very easy to switch versions later.

You can confirm that you have the correct prerequisites installed by executing the commands below in your terminal:

{{{commands}}}

If any of these return errors, or the installed versions don't match the requirements above, please look up the relevant documentation for installing/upgrading (you can use the links above).

> #### Important note on `node-gyp`
> Node and npm have a core dependency on the [`node-gyp`](https://github.com/nodejs/node-gyp) module, which requires a current version of Python and a C++ compiler to run. Depending on your system, you may need to intall these manually. Please see the [`node-gyp` installation instructions](https://github.com/nodejs/node-gyp#installation) for more details, including specific instructions for various OSes.

## Installation methods

See below for a quick guide on the different installation methods available.

> For full details on the options and parameters accepted by the install script, please see the [relevant section](at-utils?id=install) on the Utilities page.

### Standard installation

The standard installation method is recommended for general use when installing on a standalone computer as it guides you through the process of downloading and configuring the application. If you're installing on a server or want a quicker method, check out the [headless install instructions](#headless-installation).

When you run the installer, it will launch in your default web browser and walk you through the rest of the install. To run the installer, execute the following command in a terminal:
```
npx adapt-security/at-utils install [DIRECTORY]
```

***

### Headless installation

If you're installing the authoring tool on a headless server or otherwise want a more streamlined install process without the installer UI, you can run the installer using the `--no-ui` flag.

> As there's no interface to guide you through the required configuration options, it's assumed that you already have a valid config file. You can find instructions on setting this up on [this page](configure-environment).

Run the installer in headless mode with the following command:
```bash
npx adapt-security/at-utils install --no-ui [DIRECTORY]
```

***

### Developer installation

If you're a developer working on the Adapt authoring tool codebase, you can run the installer in 'dev' mode which will give you the following advantages over a standard install:

- Ability to install code from git branches
- Selective download/symlinking of Adapt modules for local development
- Dev options automatically enabled in config file

You can start the installer in dev mode with the following command:
```bash
npx adapt-security/at-utils install --dev [DIRECTORY]

```