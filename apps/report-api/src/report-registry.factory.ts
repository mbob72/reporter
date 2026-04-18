import {
  MockChannelsRepository,
  MockProductsRepository,
  MockSalesRepository,
  MockTenantRepository,
  type ChannelsRepository,
  type ProductsRepository,
  type SalesRepository,
  type TenantRepository,
} from '@report-platform/data-access';
import {
  ExternalClientFactory,
  MockSharedSettingsProvider,
  type SharedSettingsProvider,
} from '@report-platform/external-api';
import { ReportRegistry } from '@report-platform/registry';
import { createSimpleSalesSummaryDefinition } from '@report-definitions/simple-sales-summary';
import {
  SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS,
  InMemorySimpleSalesSummaryXlsxDatasetRotation,
  createSimpleSalesSummaryXlsxDefinition,
  type SimpleSalesSummaryXlsxDatasetRotation,
} from '@report-definitions/simple-sales-summary-xlsx';

export type CreateReportRegistryOptions = {
  tenantRepository: TenantRepository;
  salesRepository: SalesRepository;
  productsRepository: ProductsRepository;
  channelsRepository: ChannelsRepository;
  externalClientFactory: ExternalClientFactory;
  datasetRotation: SimpleSalesSummaryXlsxDatasetRotation;
};

export function createReportRegistry(
  options: CreateReportRegistryOptions,
): ReportRegistry {
  return new ReportRegistry([
    createSimpleSalesSummaryDefinition({
      tenantRepository: options.tenantRepository,
      salesRepository: options.salesRepository,
      externalClientFactory: options.externalClientFactory,
    }),
    createSimpleSalesSummaryXlsxDefinition({
      productsRepository: options.productsRepository,
      channelsRepository: options.channelsRepository,
      datasetRotation: options.datasetRotation,
    }),
  ]);
}

export function createReportRegistryWithoutNest(): ReportRegistry {
  const sharedSettingsProvider: SharedSettingsProvider =
    new MockSharedSettingsProvider();
  const externalClientFactory = new ExternalClientFactory(sharedSettingsProvider);

  return createReportRegistry({
    tenantRepository: new MockTenantRepository(),
    salesRepository: new MockSalesRepository(),
    productsRepository: new MockProductsRepository(),
    channelsRepository: new MockChannelsRepository(),
    externalClientFactory,
    datasetRotation: new InMemorySimpleSalesSummaryXlsxDatasetRotation(
      SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS,
    ),
  });
}
