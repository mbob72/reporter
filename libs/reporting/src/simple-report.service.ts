import type {
  CurrentUser,
  LaunchSimpleReportRequest,
  SimpleReportResponse,
} from '@contracts';
import type { SalesRepository, TenantRepository } from '@data-access';

export class SimpleReportService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly salesRepository: SalesRepository,
  ) {}

  async runSimpleReport(
    currentUser: CurrentUser,
    request: LaunchSimpleReportRequest,
  ): Promise<SimpleReportResponse> {
    const tenantName = await this.tenantRepository.getTenantName(
      currentUser,
      request.tenantId,
    );
    const organizationName = await this.tenantRepository.getOrganizationName(
      currentUser,
      request.tenantId,
      request.organizationId,
    );
    const currentSalesAmount = await this.salesRepository.getCurrentSalesAmount(
      currentUser,
      request.tenantId,
      request.organizationId,
    );

    return {
      tenantName,
      organizationName,
      currentSalesAmount,
    };
  }
}
