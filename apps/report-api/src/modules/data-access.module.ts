import { Module } from '@nestjs/common';

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

@Module({
  providers: [
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
  ],
  exports: [
    TENANT_REPOSITORY_TOKEN,
    SALES_REPOSITORY_TOKEN,
    PRODUCTS_REPOSITORY_TOKEN,
    CHANNELS_REPOSITORY_TOKEN,
  ],
})
export class DataAccessModule {}
