    it('should reject on malformed JSON', async () => {
      const req = new EventEmitter()
      req.method = 'POST'
      process.nextTick(() => {
        req.emit('data', '{invalid json')
        req.emit('end')
      })
      await assert.rejects(parseBody(req), { name: 'SyntaxError' })
    })