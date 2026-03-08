    it('should handle query param without value', () => {
      const req = { url: '/path?flag' }
      assert.deepEqual(parseQuery(req), { flag: '' })
    })

    it('should handle query param with empty value', () => {
      const req = { url: '/path?key=' }
      assert.deepEqual(parseQuery(req), { key: '' })
    })