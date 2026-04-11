import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4200,
    proxy: {
      '/launch-report': {
        target: 'http://localhost:3000',
      },
    },
  },
});
