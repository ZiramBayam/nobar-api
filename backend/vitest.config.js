import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Satu file test berjalan pada satu waktu supaya data user test tidak
    // saling bertabrakan di database yang sama.
    fileParallelism: false,
    sequence: { concurrent: false },
    globalSetup: ['./tests/global-setup.js'],
    setupFiles: ['./tests/setup.js'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
