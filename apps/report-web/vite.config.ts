import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { reportWebAliases } from './vite.aliases';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

function parsePort(rawPort: string | undefined, fallbackPort: number): number {
  const parsedPort = Number.parseInt(rawPort ?? '', 10);
  return Number.isFinite(parsedPort) ? parsedPort : fallbackPort;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const serverHost = env.WEB_HOST ?? '0.0.0.0';
  const serverPort = parsePort(env.WEB_PORT, 4200);
  const proxyTarget = env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:3000';

  return {
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
      host: serverHost,
      port: serverPort,
      proxy: {
        '/reports': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/tenants': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/generated-files': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/report-runs': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
