import type { ApiError, CurrentUser } from '@report-platform/contracts';
import type { SalesRepository, TenantRepository } from '@report-platform/data-access';
import { getOrganizationsByTenant } from '@report-platform/data-access';

import type {
  SimpleSalesSummaryResult,
} from './simple-sales-summary.contract';

function throwValidationError(message: string): never {
  throw {
    code: 'VALIDATION_ERROR',
    message,
  } satisfies ApiError;
}

function throwNotFound(message: string): never {
  throw {
    code: 'NOT_FOUND',
    message,
  } satisfies ApiError;
}

export class SimpleSalesSummaryService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly salesRepository: SalesRepository,
  ) {}

  async run(currentUser: CurrentUser): Promise<SimpleSalesSummaryResult> {
    const tenantId = currentUser.tenantId;

    if (!tenantId) {
      throwValidationError('Simple Sales Summary requires a tenant-scoped user.');
    }

    const defaultOrganization = getOrganizationsByTenant(tenantId)[0];

    if (!defaultOrganization) {
      throwNotFound('Organization not found for current tenant.');
    }

    const tenantName = await this.tenantRepository.getTenantName(
      currentUser,
      tenantId,
    );
    const organizationName = await this.tenantRepository.getOrganizationName(
      currentUser,
      tenantId,
      defaultOrganization.id,
    );
    const currentSalesAmount = await this.salesRepository.getCurrentSalesAmount(
      currentUser,
      tenantId,
      defaultOrganization.id,
    );

    return {
      tenantName,
      organizationName,
      currentSalesAmount,
    };
  }
}
