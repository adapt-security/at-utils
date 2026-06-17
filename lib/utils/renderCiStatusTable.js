import ciStatusEmoji from './ciStatusEmoji.js'

export default function renderCiStatusTable (rows, updated) {
  const lines = [
    '## Dependency CI status',
    '',
    `_Latest run on each repo's default branch. Updated ${updated}._`,
    '',
    '| Module | Status |',
    '| --- | --- |'
  ]
  for (const row of rows) {
    lines.push(`| [${row.name}](${row.url}) | ${ciStatusEmoji(row.state)} \`${row.state}\` |`)
  }
  return lines.join('\n')
}
