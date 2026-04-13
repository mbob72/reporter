import type { CurrentUser } from '@report-platform/contracts';
import type { SalesRepository, TenantRepository } from '@report-platform/data-access';

import type {
  SimpleSalesSummaryParams,
  SimpleSalesSummaryResult,
} from './simple-sales-summary.contract';

export class SimpleSalesSummaryService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly salesRepository: SalesRepository,
  ) {}

  async run(
    currentUser: CurrentUser,
    params: SimpleSalesSummaryParams,
  ): Promise<SimpleSalesSummaryResult> {
    const tenantName = await this.tenantRepository.getTenantName(
      currentUser,
      params.tenantId,
    );
    const organizationName = await this.tenantRepository.getOrganizationName(
      currentUser,
      params.tenantId,
      params.organizationId,
    );
    const currentSalesAmount = await this.salesRepository.getCurrentSalesAmount(
      currentUser,
      params.tenantId,
      params.organizationId,
    );

    return {
      tenantName,
      organizationName,
      currentSalesAmount,
    };
  }
}
