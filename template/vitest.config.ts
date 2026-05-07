import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const projectRoot = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    reporters: ['default', ['tdd-guard-vitest', { projectRoot }]],
  },
})
