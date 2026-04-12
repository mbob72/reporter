import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  resolve: {
    alias: {
      '@contracts': fileURLToPath(new URL('../../libs/contracts/src/index.ts', import.meta.url)),
      '@auth': fileURLToPath(new URL('../../libs/auth/src/index.ts', import.meta.url)),
      '@api-client': fileURLToPath(new URL('../../libs/api-client/src/index.ts', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4200,
    proxy: {
      '/reports': {
        target: 'http://127.0.0.1:3000',
      },
    },
  },
});
