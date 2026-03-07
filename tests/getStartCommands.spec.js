import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import getStartCommands from '../lib/utils/getStartCommands.js'

describe('getStartCommands', () => {
  describe('#getStartCommands()', () => {
    it('should return an object', () => {
      assert.equal(typeof getStartCommands('/some/dir'), 'object')
    })

    it('should include a bash property', () => {
      const result = getStartCommands('/some/dir')
      assert.ok(Object.hasOwn(result, 'bash'))
    })

    it('should include the directory path in the bash command', () => {
      const result = getStartCommands('/some/dir')
      assert.ok(result.bash.includes('/some/dir'))
    })

    it('should include npm start in the bash command', () => {
      const result = getStartCommands('/some/dir')
      assert.ok(result.bash.includes('npm start'))
    })

    it('should not include a windows property on non-Windows platforms', () => {
      if (process.platform !== 'win32') {
        const result = getStartCommands('/some/dir')
        assert.ok(!Object.hasOwn(result, 'windows'))
      }
    })
  })
})
