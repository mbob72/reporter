import { fileURLToPath } from 'node:url';

import type { AliasOptions } from 'vite';

export const reportWebAliases: AliasOptions = {
  '@report-platform/contracts': fileURLToPath(
    new URL('../../libs/report-platform/contracts/src/index.ts', import.meta.url),
  ),
  '@report-platform/auth': fileURLToPath(
    new URL('../../libs/report-platform/auth/src/index.ts', import.meta.url),
  ),
  '@report-platform/data-access': fileURLToPath(
    new URL('../../libs/report-platform/data-access/src/index.ts', import.meta.url),
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
