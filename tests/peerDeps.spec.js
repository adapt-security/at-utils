    it('should extract module names with double quotes', () => {
      const file = join(tmpDir, 'test-double.js')
      writeFileSync(file, 'await app.waitForModule("core")')
      const result = extractModuleNames([file])
      assert.ok(result.has('core'))
    })