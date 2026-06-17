const START = '<!-- ci-status:start -->'
const END = '<!-- ci-status:end -->'

// Replaces the content between the ci-status markers with the given section,
// leaving the markers in place. Throws if the markers are missing or malformed.
export default function spliceReadmeSection (content, section, start = START, end = END) {
  const startIdx = content.indexOf(start)
  const endIdx = content.indexOf(end)
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Could not find ci-status markers (${start} … ${end})`)
  }
  return content.slice(0, startIdx + start.length) + '\n' + section + '\n' + content.slice(endIdx)
}
