import type { Role } from '@report-platform/contracts';
import type { BuiltFile } from '@report-platform/xlsx';

const roleRank: Record<Role, number> = {
  Auditor: 0,
  Member: 1,
  TenantAdmin: 2,
  Admin: 3,
};

export function hasRoleAccess(currentRole: Role, minRole: Role): boolean {
  return roleRank[currentRole] >= roleRank[minRole];
}

export function isBuiltFile(value: unknown): value is BuiltFile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BuiltFile>;

  return (
    typeof candidate.fileName === 'string' &&
    typeof candidate.mimeType === 'string' &&
    candidate.bytes instanceof Uint8Array
  );
}
