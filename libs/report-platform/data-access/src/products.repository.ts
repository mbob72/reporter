import type { CurrentUser } from '@report-platform/contracts';

import type { ProductTemplateRow } from './product-channel-template.types';

export interface ProductsRepository {
  listProductsForTemplate(
    currentUser: CurrentUser,
    datasetKey: string,
  ): Promise<ProductTemplateRow[]>;
}

export const PRODUCTS_REPOSITORY_TOKEN = 'PRODUCTS_REPOSITORY_TOKEN';
