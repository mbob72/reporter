import type { CurrentUser } from '@report-platform/contracts';

export interface TenantRepository {
  getTenantName(currentUser: CurrentUser, tenantId: string): Promise<string>;
  getOrganizationName(
    currentUser: CurrentUser,
    tenantId: string,
    organizationId: string,
  ): Promise<string>;
}

export const TENANT_REPOSITORY_TOKEN = 'TENANT_REPOSITORY_TOKEN';
