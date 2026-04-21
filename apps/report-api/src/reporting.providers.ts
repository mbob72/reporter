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
  SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS,
  InMemorySimpleSalesSummaryXlsxDatasetRotation,
  type SimpleSalesSummaryXlsxDatasetRotation,
} from '@report-definitions/simple-sales-summary-xlsx';

import { ReportInstanceRunner } from './report-instance.runner';
import { FileSystemReportInstanceStore } from './report-instance.store';
import { createReportRegistry } from './report-registry.factory';

export const REPORT_REGISTRY_TOKEN = 'REPORT_REGISTRY_TOKEN';
export const SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN =
  'SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN';
export const REPORT_INSTANCE_STORE_TOKEN = 'REPORT_INSTANCE_STORE_TOKEN';
export const REPORT_INSTANCE_RUNNER_TOKEN = 'REPORT_INSTANCE_RUNNER_TOKEN';

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
    provide: REPORT_INSTANCE_STORE_TOKEN,
    useFactory: () => new FileSystemReportInstanceStore(),
  },
  {
    provide: REPORT_INSTANCE_RUNNER_TOKEN,
    inject: [
      REPORT_INSTANCE_STORE_TOKEN,
      SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN,
    ],
    useFactory: (
      reportInstanceStore: FileSystemReportInstanceStore,
      datasetRotation: SimpleSalesSummaryXlsxDatasetRotation,
    ) => new ReportInstanceRunner(reportInstanceStore, datasetRotation),
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
      createReportRegistry({
        tenantRepository,
        salesRepository,
        externalClientFactory,
        productsRepository,
        channelsRepository,
        datasetRotation,
      }),
  },
];
