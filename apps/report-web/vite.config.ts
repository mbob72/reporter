import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  resolve: {
    alias: {
      '@report-platform/contracts': fileURLToPath(
        new URL('../../libs/report-platform/contracts/src/index.ts', import.meta.url),
      ),
      '@report-platform/auth': fileURLToPath(
        new URL('../../libs/report-platform/auth/src/index.ts', import.meta.url),
      ),
      '@report-platform/data-access': fileURLToPath(
        new URL('../../libs/report-platform/data-access/src/index.ts', import.meta.url),
      ),
      '@report-platform/api-client': fileURLToPath(
        new URL('../../libs/report-platform/api-client/src/index.ts', import.meta.url),
      ),
      '@report-platform/external-api': fileURLToPath(
        new URL('../../libs/report-platform/external-api/src/index.ts', import.meta.url),
      ),
      '@report-definitions/simple-sales-summary': fileURLToPath(
        new URL(
          '../../libs/report-definitions/simple-sales-summary/src/index.ts',
          import.meta.url,
        ),
      ),
      '@report-definitions/simple-sales-summary-xlsx': fileURLToPath(
        new URL(
          '../../libs/report-definitions/simple-sales-summary-xlsx/src/index.ts',
          import.meta.url,
        ),
      ),
    },
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
