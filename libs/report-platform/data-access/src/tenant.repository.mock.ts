import type { ApiError, CurrentUser } from '@report-platform/contracts';
import { canAccessTenantData } from '@report-platform/auth';

import type { TenantRepository } from './tenant.repository';

const tenantNames = new Map<string, string>([
  ['tenant-1', 'Acme Tenant'],
  ['tenant-2', 'Globex Tenant'],
]);

const organizationNames = new Map<string, string>([
  ['tenant-1:org-1', 'Acme North'],
  ['tenant-1:org-2', 'Acme South'],
  ['tenant-2:org-3', 'Globex Main'],
]);

function throwForbidden(): never {
  throw {
    code: 'FORBIDDEN',
    message: 'You do not have access to this tenant.',
  } satisfies ApiError;
}

function throwNotFound(message: string): never {
  throw {
    code: 'NOT_FOUND',
    message,
  } satisfies ApiError;
}

function assertTenantAccess(currentUser: CurrentUser, tenantId: string) {
  if (!canAccessTenantData(currentUser, tenantId)) {
    throwForbidden();
  }
}

function buildOrganizationKey(tenantId: string, organizationId: string) {
  return `${tenantId}:${organizationId}`;
}

export class MockTenantRepository implements TenantRepository {
  async getTenantName(currentUser: CurrentUser, tenantId: string): Promise<string> {
    assertTenantAccess(currentUser, tenantId);

    const tenantName = tenantNames.get(tenantId);

    if (!tenantName) {
      throwNotFound('Tenant not found.');
    }

    return tenantName;
  }

  async getOrganizationName(
    currentUser: CurrentUser,
    tenantId: string,
    organizationId: string,
  ): Promise<string> {
    assertTenantAccess(currentUser, tenantId);

    const organizationName = organizationNames.get(
      buildOrganizationKey(tenantId, organizationId),
    );

    if (!organizationName) {
      throwNotFound('Organization not found.');
    }

    return organizationName;
  }
}
