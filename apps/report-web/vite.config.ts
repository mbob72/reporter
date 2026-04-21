import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { reportWebAliases } from './vite.aliases';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  resolve: {
    alias: reportWebAliases,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    clearMocks: true,
  },
  server: {
    host: '127.0.0.1',
    port: 4200,
    proxy: {
      '/reports': {
        target: 'http://127.0.0.1:3000',
      },
      '/tenants': {
        target: 'http://127.0.0.1:3000',
      },
      '/generated-files': {
        target: 'http://127.0.0.1:3000',
      },
      '/report-runs': {
        target: 'http://127.0.0.1:3000',
      },
    },
  },
});
