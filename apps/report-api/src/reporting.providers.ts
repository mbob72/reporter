import type { Provider } from '@nestjs/common';

import {
  CHANNELS_REPOSITORY_TOKEN,
  MockChannelsRepository,
  MockProductsRepository,
  MockSalesRepository,
  MockTenantRepository,
  PRODUCTS_REPOSITORY_TOKEN,
  SALES_REPOSITORY_TOKEN,
  TENANT_REPOSITORY_TOKEN,
  type ChannelsRepository,
  type ProductsRepository,
  type SalesRepository,
  type TenantRepository,
} from '@report-platform/data-access';
import {
  EXTERNAL_CLIENT_FACTORY_TOKEN,
  ExternalClientFactory,
  MockSharedSettingsProvider,
  SHARED_SETTINGS_PROVIDER_TOKEN,
  type SharedSettingsProvider,
} from '@report-platform/external-api';
import {
  GENERATED_FILE_STORE_TOKEN,
  InMemoryGeneratedFileStore,
} from '@report-platform/file-store';
import { ReportRegistry } from '@report-platform/registry';
import { createSimpleSalesSummaryDefinition } from '@report-definitions/simple-sales-summary';
import {
  SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS,
  InMemorySimpleSalesSummaryXlsxDatasetRotation,
  createSimpleSalesSummaryXlsxDefinition,
  type SimpleSalesSummaryXlsxDatasetRotation,
} from '@report-definitions/simple-sales-summary-xlsx';

export const REPORT_REGISTRY_TOKEN = 'REPORT_REGISTRY_TOKEN';
export const SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN =
  'SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN';

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
    provide: PRODUCTS_REPOSITORY_TOKEN,
    useFactory: (): ProductsRepository => new MockProductsRepository(),
  },
  {
    provide: CHANNELS_REPOSITORY_TOKEN,
    useFactory: (): ChannelsRepository => new MockChannelsRepository(),
  },
  {
    provide: SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN,
    useFactory: (): SimpleSalesSummaryXlsxDatasetRotation =>
      new InMemorySimpleSalesSummaryXlsxDatasetRotation(
        SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS,
      ),
  },
  {
    provide: SHARED_SETTINGS_PROVIDER_TOKEN,
    useFactory: (): SharedSettingsProvider => new MockSharedSettingsProvider(),
  },
  {
    provide: EXTERNAL_CLIENT_FACTORY_TOKEN,
    inject: [SHARED_SETTINGS_PROVIDER_TOKEN],
    useFactory: (
      sharedSettingsProvider: SharedSettingsProvider,
    ): ExternalClientFactory => new ExternalClientFactory(sharedSettingsProvider),
  },
  {
    provide: GENERATED_FILE_STORE_TOKEN,
    useFactory: () => new InMemoryGeneratedFileStore(),
  },
  {
    provide: REPORT_REGISTRY_TOKEN,
    inject: [
      TENANT_REPOSITORY_TOKEN,
      SALES_REPOSITORY_TOKEN,
      EXTERNAL_CLIENT_FACTORY_TOKEN,
      PRODUCTS_REPOSITORY_TOKEN,
      CHANNELS_REPOSITORY_TOKEN,
      SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN,
    ],
    useFactory: (
      tenantRepository: TenantRepository,
      salesRepository: SalesRepository,
      externalClientFactory: ExternalClientFactory,
      productsRepository: ProductsRepository,
      channelsRepository: ChannelsRepository,
      datasetRotation: SimpleSalesSummaryXlsxDatasetRotation,
    ) =>
      new ReportRegistry([
        createSimpleSalesSummaryDefinition({
          tenantRepository,
          salesRepository,
          externalClientFactory,
        }),
        createSimpleSalesSummaryXlsxDefinition({
          productsRepository,
          channelsRepository,
          datasetRotation,
        }),
      ]),
  },
];
