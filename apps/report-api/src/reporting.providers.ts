import type { Provider } from '@nestjs/common';

import {
  MockSalesRepository,
  MockTenantRepository,
  SALES_REPOSITORY_TOKEN,
  TENANT_REPOSITORY_TOKEN,
  type SalesRepository,
  type TenantRepository,
} from '@report-platform/data-access';
import {
  EXTERNAL_AUTH_PROVIDER_TOKEN,
  EXTERNAL_CLIENT_FACTORY_TOKEN,
  ExternalClientFactory,
  MockExternalAuthProvider,
  MockSharedSettingsProvider,
  SHARED_SETTINGS_PROVIDER_TOKEN,
  type ExternalAuthProvider,
  type SharedSettingsProvider,
} from '@report-platform/external-api';
import {
  GENERATED_FILE_STORE_TOKEN,
  InMemoryGeneratedFileStore,
} from '@report-platform/file-store';
import { ReportRegistry } from '@report-platform/registry';
import { createSimpleSalesSummaryDefinition } from '@report-definitions/simple-sales-summary';
import { createSimpleSalesSummaryXlsxDefinition } from '@report-definitions/simple-sales-summary-xlsx';
import { mockXlsxWriter } from '@report-platform/xlsx';

export const REPORT_REGISTRY_TOKEN = 'REPORT_REGISTRY_TOKEN';

export const reportingProviders: Provider[] = [
  {
    provide: TENANT_REPOSITORY_TOKEN,
    useFactory: (): TenantRepository => new MockTenantRepository(),
  },
  {
    provide: SALES_REPOSITORY_TOKEN,
    useFactory: (): SalesRepository => new MockSalesRepository(),
  },
  {
    provide: SHARED_SETTINGS_PROVIDER_TOKEN,
    useFactory: (): SharedSettingsProvider => new MockSharedSettingsProvider(),
  },
  {
    provide: EXTERNAL_AUTH_PROVIDER_TOKEN,
    useFactory: (): ExternalAuthProvider => new MockExternalAuthProvider(),
  },
  {
    provide: EXTERNAL_CLIENT_FACTORY_TOKEN,
    inject: [SHARED_SETTINGS_PROVIDER_TOKEN, EXTERNAL_AUTH_PROVIDER_TOKEN],
    useFactory: (
      sharedSettingsProvider: SharedSettingsProvider,
      externalAuthProvider: ExternalAuthProvider,
    ): ExternalClientFactory =>
      new ExternalClientFactory(sharedSettingsProvider, externalAuthProvider),
  },
  {
    provide: GENERATED_FILE_STORE_TOKEN,
    useFactory: () => new InMemoryGeneratedFileStore(),
  },
  {
    provide: REPORT_REGISTRY_TOKEN,
    inject: [TENANT_REPOSITORY_TOKEN, SALES_REPOSITORY_TOKEN],
    useFactory: (
      tenantRepository: TenantRepository,
      salesRepository: SalesRepository,
    ) =>
      new ReportRegistry([
        createSimpleSalesSummaryDefinition({
          tenantRepository,
          salesRepository,
        }),
        createSimpleSalesSummaryXlsxDefinition({
          tenantRepository,
          salesRepository,
          xlsxWriter: mockXlsxWriter,
        }),
      ]),
  },
];
