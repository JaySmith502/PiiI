import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts on purpose: the build config loads the crxjs
// manifest plugin, which has nothing to do with unit tests of pure modules.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
