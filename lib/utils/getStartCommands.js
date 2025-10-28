export default function getStartCommands (cwd) {
  const getCmd = dir => `cd ${dir}\nnpm start`
  const data = { bash: getCmd(cwd) }
  if (process.platform === 'win32') {
    data.windows = getCmd(cwd)
    const driveLetter = cwd.match(/^[A-Z]/)[0].toLowerCase()
    data.bash = getCmd(`/${driveLetter}/${cwd.replaceAll(/\\/g, '/').slice(3)}`)
  }
  return data
}
