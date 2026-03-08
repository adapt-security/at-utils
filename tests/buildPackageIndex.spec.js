    it('should skip packages without version field', () => {
      const testDir = join(tmpdir(), `buildPkgIndex-noversion-${Date.now()}`)
      mkdirSync(join(testDir, 'no-version-pkg'), { recursive: true })
      writeFileSync(
        join(testDir, 'no-version-pkg', 'package.json'),
        JSON.stringify({ name: 'adapt-authoring-noversion' })
      )
      try {
        const result = buildPackageIndex(testDir)
        assert.ok(!result.has('adapt-authoring-noversion'))
      } finally {
        rmSync(testDir, { recursive: true, force: true })
      }
    })