import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import spliceReadmeSection from '../lib/utils/spliceReadmeSection.js'

const START = '<!-- ci-status:start -->'
const END = '<!-- ci-status:end -->'

describe('spliceReadmeSection', () => {
  it('replaces content between the markers', () => {
    const content = `# Title\n\n${START}\nold\n${END}\n\nFooter\n`
    const result = spliceReadmeSection(content, 'NEW')
    assert.equal(result, `# Title\n\n${START}\nNEW\n${END}\n\nFooter\n`)
  })

  it('works when the markers are empty', () => {
    const content = `${START}\n${END}`
    assert.equal(spliceReadmeSection(content, 'TABLE'), `${START}\nTABLE\n${END}`)
  })

  it('throws when markers are missing', () => {
    assert.throws(() => spliceReadmeSection('no markers here', 'X'), /Could not find/)
  })

  it('throws when end precedes start', () => {
    assert.throws(() => spliceReadmeSection(`${END}\n${START}`, 'X'), /Could not find/)
  })
})
