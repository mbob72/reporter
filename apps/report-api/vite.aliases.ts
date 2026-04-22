import { fileURLToPath } from 'node:url';

import type { AliasOptions } from 'vite';

export const reportApiAliases: AliasOptions = {
  '@report-platform/contracts': fileURLToPath(
    new URL('../../libs/report-platform/contracts/src/index.ts', import.meta.url),
  ),
  '@report-platform/auth': fileURLToPath(
    new URL('../../libs/report-platform/auth/src/index.ts', import.meta.url),
  ),
  '@report-platform/data-access': fileURLToPath(
    new URL('../../libs/report-platform/data-access/src/index.ts', import.meta.url),
  ),
  '@report-platform/xlsx': fileURLToPath(
    new URL('../../libs/report-platform/xlsx/src/index.ts', import.meta.url),
  ),
  '@report-platform/file-store': fileURLToPath(
    new URL('../../libs/report-platform/file-store/src/index.ts', import.meta.url),
  ),
  '@report-platform/registry': fileURLToPath(
    new URL('../../libs/report-platform/registry/src/index.ts', import.meta.url),
  ),
  '@report-platform/api-client': fileURLToPath(
    new URL('../../libs/report-platform/api-client/src/index.ts', import.meta.url),
  ),
  '@report-platform/external-api': fileURLToPath(
    new URL('../../libs/report-platform/external-api/src/index.ts', import.meta.url),
  ),
  '@report-definitions/simple-sales-summary': fileURLToPath(
    new URL('../../libs/report-definitions/simple-sales-summary/src/index.ts', import.meta.url),
  ),
  '@report-definitions/simple-sales-summary-xlsx': fileURLToPath(
    new URL(
      '../../libs/report-definitions/simple-sales-summary-xlsx/src/index.ts',
      import.meta.url,
    ),
  ),
};
