# Installation

This page will walk you through the installation of your own local instance of the Adapt authoring tool.

_**Note**: prior knowledge of your command line interface (or the ability to use Google!) is recommended, as things can get technical when errors occur._

## 1. Install prerequisites
The first step is to make sure you have the required prerequisites installed, and are using the correct versions of these.

You can confirm this by executing the commands below:

```
node --version
v14.*

git --version
v2.*

mongod --version
db version v3+
```

If any of these return errors, or the installed versions don't match the requirements above, please look up the relevant documentation for installing/upgrading:
- [Node.js](https://nodejs.org/en/download/)
- [git](https://git-scm.com/downloads)
- [MongoDB](https://www.mongodb.com/try/download/community)

## 2. Clone the repo
The next step is to get your hands on the code. The best way to do this is via git:
```
git clone https://github.com/adaptlearning/adapt-authoring
```
```
cd adapt-authoring
```

## 3. Install the dependencies
Now, you need to install the app's module dependencies, which are managed by NPM:
```
npm install
```

## 4. Run the installer
The authoring tool comes bundled with a user-friendly installer which will walk you through the remaining steps of the install. To run the installer, execute the following command in a terminal:
```
npx install-aat
```
The installer should automatically open in your default web browser, and will guide you through the rest of the process.

Good luck!
