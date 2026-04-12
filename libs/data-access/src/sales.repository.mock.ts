import type { ApiError, CurrentUser } from '@contracts';
import { canAccessTenantData } from '@auth';

import type { SalesRepository } from './sales.repository';

const salesAmounts = new Map<string, number>([
  ['tenant-1:org-1', 125000],
  ['tenant-1:org-2', 83000],
  ['tenant-2:org-3', 412000],
]);

function throwForbidden(): never {
  throw {
    code: 'FORBIDDEN',
    message: 'You do not have access to this tenant.',
  } satisfies ApiError;
}

function throwNotFound(): never {
  throw {
    code: 'NOT_FOUND',
    message: 'Sales data not found.',
  } satisfies ApiError;
}

function assertTenantAccess(currentUser: CurrentUser, tenantId: string) {
  if (!canAccessTenantData(currentUser, tenantId)) {
    throwForbidden();
  }
}

function buildSalesKey(tenantId: string, organizationId: string) {
  return `${tenantId}:${organizationId}`;
}

export class MockSalesRepository implements SalesRepository {
  async getCurrentSalesAmount(
    currentUser: CurrentUser,
    tenantId: string,
    organizationId: string,
  ): Promise<number> {
    assertTenantAccess(currentUser, tenantId);

    const currentSalesAmount = salesAmounts.get(buildSalesKey(tenantId, organizationId));

    if (typeof currentSalesAmount !== 'number') {
      throwNotFound();
    }

    return currentSalesAmount;
  }
}
