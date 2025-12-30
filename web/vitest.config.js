import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom environment for DOM testing
    environment: 'jsdom',

    // Global test utilities
    globals: true,

    // Setup files to run before tests
    setupFiles: './src/test/setup.js',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/*.config.ts',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
      // Coverage thresholds
      statements: 70,
      branches: 65,
      functions: 70,
      lines: 70,
    },

    // Include/exclude patterns
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],

    // Test timeout
    testTimeout: 10000,

    // Retry failed tests
    retry: 0,
  },

  // Resolve aliases to match Vite config
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
