import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { reportWebAliases } from './vite.aliases';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  resolve: {
    alias: reportWebAliases,
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
      '/report-jobs': {
        target: 'http://127.0.0.1:3000',
      },
    },
  },
});
