import type { CurrentUser } from '@contracts';

export function canAccessTenantData(
  currentUser: CurrentUser,
  requestedTenantId: string,
): boolean {
  switch (currentUser.role) {
    case 'Admin':
      return true;
    case 'TenantAdmin':
      return currentUser.tenantId === requestedTenantId;
    case 'Member':
    case 'Auditor':
      return false;
    default:
      return false;
  }
}
