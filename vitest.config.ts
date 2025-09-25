import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{js,ts,mjs,mts}'],
      exclude: [
        'src/types.d.ts',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})