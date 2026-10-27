import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/utils/packing/__tests__/setup.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    resolve: {
      alias: {
        './export': './export.ts',
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
  },
});