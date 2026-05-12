import { Module } from '@nestjs/common';

import {
  CHANNELS_REPOSITORY_TOKEN,
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
} from '@report-platform/external-api';
import {
  SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS,
  InMemorySimpleSalesSummaryXlsxDatasetRotation,
  type SimpleSalesSummaryXlsxDatasetRotation,
} from '@report-definitions/simple-sales-summary-xlsx';

import { createReportRegistry } from '../report-registry.factory';
import {
  REPORT_REGISTRY_TOKEN,
  SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN,
} from '../reporting.tokens';
import { DataAccessModule } from './data-access.module';
import { ExternalServicesModule } from './external-services.module';

@Module({
  imports: [DataAccessModule, ExternalServicesModule],
  providers: [
    {
      provide: SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN,
      useFactory: (): SimpleSalesSummaryXlsxDatasetRotation =>
        new InMemorySimpleSalesSummaryXlsxDatasetRotation(SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS),
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
  ],
  exports: [SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN, REPORT_REGISTRY_TOKEN],
})
export class ReportRegistryModule {}
