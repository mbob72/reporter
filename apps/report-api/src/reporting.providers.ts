import type { Provider } from '@nestjs/common';

import {
  MockSalesRepository,
  MockTenantRepository,
  SALES_REPOSITORY_TOKEN,
  TENANT_REPOSITORY_TOKEN,
  type SalesRepository,
  type TenantRepository,
} from '@data-access';
import { SimpleReportService } from '@reporting';

export const SIMPLE_REPORT_SERVICE_TOKEN = 'SIMPLE_REPORT_SERVICE_TOKEN';

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
    provide: SIMPLE_REPORT_SERVICE_TOKEN,
    inject: [TENANT_REPOSITORY_TOKEN, SALES_REPOSITORY_TOKEN],
    useFactory: (
      tenantRepository: TenantRepository,
      salesRepository: SalesRepository,
    ) => new SimpleReportService(tenantRepository, salesRepository),
  },
];
