import exec from './exec.js'

const GITHUB_ORG_URL = 'https://github.com/adapt-security'
const GITHUB_REPO = 'adapt-authoring'

export default async function cloneRepo (options) {
  const url = `${GITHUB_ORG_URL}/${options.repo || GITHUB_REPO}.git`
  const tag = options.tag || 'master'
  console.log(`Cloning ${url}#${tag} into ${options.cwd}`)
  try {
    await exec(`git clone --branch ${tag} ${url} ${options.cwd}`)
  } catch (e) {
    const error = new Error(`Failed to clone git repository, ${e.message}`)
    error.code = 'GITCLONEEEXIST'
    throw error
  }
  console.log('Installing npm dependencies')
  await exec(`npm ${options.cleanInstall === false ? 'install' : 'ci'}`, options.cwd)
}