import type { Role } from '@report-platform/contracts';

const roleRank: Record<Role, number> = {
  Auditor: 0,
  Member: 1,
  TenantAdmin: 2,
  Admin: 3,
};

export function hasRoleAccess(currentRole: Role, minRole: Role): boolean {
  return roleRank[currentRole] >= roleRank[minRole];
}
