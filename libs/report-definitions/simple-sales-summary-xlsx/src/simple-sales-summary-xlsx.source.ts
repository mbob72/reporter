import type { CurrentUser } from '@report-platform/contracts';
import type {
  ChannelTemplateRow,
  ChannelsRepository,
  ProductTemplateRow,
  ProductsRepository,
} from '@report-platform/data-access';

export const SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS = [
  'winter_base',
  'holiday_spike',
  'margin_protection',
] as const;

export interface SimpleSalesSummaryXlsxDatasetRotation {
  nextDatasetKey(): string;
}

export class InMemorySimpleSalesSummaryXlsxDatasetRotation
  implements SimpleSalesSummaryXlsxDatasetRotation
{
  private nextIndex = 0;

  constructor(private readonly datasetKeys: readonly string[]) {
    if (datasetKeys.length === 0) {
      throw new Error('Dataset rotation requires at least one dataset key.');
    }
  }

  nextDatasetKey(): string {
    const datasetKey = this.datasetKeys[this.nextIndex];

    this.nextIndex = (this.nextIndex + 1) % this.datasetKeys.length;

    return datasetKey;
  }
}

export type SimpleSalesSummaryXlsxSource = {
  datasetKey: string;
  products: ProductTemplateRow[];
  channels: ChannelTemplateRow[];
};

export class SimpleSalesSummaryXlsxSourceService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly channelsRepository: ChannelsRepository,
    private readonly datasetRotation: SimpleSalesSummaryXlsxDatasetRotation,
  ) {}

  async getSource(currentUser: CurrentUser): Promise<SimpleSalesSummaryXlsxSource> {
    const datasetKey = this.datasetRotation.nextDatasetKey();
    const [products, channels] = await Promise.all([
      this.productsRepository.listProductsForTemplate(currentUser, datasetKey),
      this.channelsRepository.listChannelsForTemplate(currentUser, datasetKey),
    ]);

    return {
      datasetKey,
      products,
      channels,
    };
  }
}
