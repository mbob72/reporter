import type { ApiError, CurrentUser } from '@report-platform/contracts';

import type { ProductTemplateRow } from './product-channel-template.types';
import type { ProductsRepository } from './products.repository';

const productsByDatasetKey = new Map<string, ProductTemplateRow[]>([
  [
    'winter_base',
    [
      {
        productName: 'Beef Pelmeni 800g',
        basePrice: 8.2,
        baseUnits: 140,
      },
      {
        productName: 'Chicken Pelmeni 800g',
        basePrice: 7.4,
        baseUnits: 165,
      },
    ],
  ],
  [
    'holiday_spike',
    [
      {
        productName: 'Beef Pelmeni 800g',
        basePrice: 8.6,
        baseUnits: 170,
      },
      {
        productName: 'Chicken Pelmeni 800g',
        basePrice: 7.8,
        baseUnits: 210,
      },
    ],
  ],
  [
    'margin_protection',
    [
      {
        productName: 'Beef Pelmeni 800g',
        basePrice: 8.9,
        baseUnits: 125,
      },
      {
        productName: 'Chicken Pelmeni 800g',
        basePrice: 8.1,
        baseUnits: 150,
      },
    ],
  ],
]);

function throwForbidden(): never {
  throw {
    code: 'FORBIDDEN',
    message: 'You do not have access to product template data.',
  } satisfies ApiError;
}

function throwNotFound(): never {
  throw {
    code: 'NOT_FOUND',
    message: 'Product template dataset not found.',
  } satisfies ApiError;
}

function assertTemplateAccess(currentUser: CurrentUser) {
  switch (currentUser.role) {
    case 'Admin':
    case 'TenantAdmin':
      return;
    case 'Member':
    case 'Auditor':
      return throwForbidden();
    default:
      return throwForbidden();
  }
}

export class MockProductsRepository implements ProductsRepository {
  async listProductsForTemplate(
    currentUser: CurrentUser,
    datasetKey: string,
  ): Promise<ProductTemplateRow[]> {
    assertTemplateAccess(currentUser);

    const datasetRows = productsByDatasetKey.get(datasetKey);

    if (!datasetRows) {
      throwNotFound();
    }

    return datasetRows.map((row) => ({
      productName: row.productName,
      basePrice: row.basePrice,
      baseUnits: row.baseUnits,
    }));
  }
}
