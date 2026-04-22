import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { reportApiAliases } from './vite.aliases';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: rootDir,
  resolve: {
    alias: reportApiAliases,
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.spec.ts'],
    clearMocks: true,
  },
});
