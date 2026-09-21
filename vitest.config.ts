import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    isolate: true,
    fileParallelism: true,
    maxWorkers: 4,
    minWorkers: 4,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: Array.from({ length: 16 }, (_, i) =>
        `src/features/feature-${String(i + 1).padStart(2, '0')}.ts`
      ),
      exclude: ['src/features/index.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 95,
        functions: 95,
        statements: 95,
        branches: 75
      }
    }
  }
})
