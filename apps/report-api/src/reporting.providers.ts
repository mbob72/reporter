import type { Provider } from '@nestjs/common';

import {
  MockSalesRepository,
  MockTenantRepository,
  SALES_REPOSITORY_TOKEN,
  TENANT_REPOSITORY_TOKEN,
  type SalesRepository,
  type TenantRepository,
} from '@report-platform/data-access';
import { ReportRegistry } from '@report-platform/registry';
import { createSimpleSalesSummaryDefinition } from '@report-definitions/simple-sales-summary';

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
      ]),
  },
];
