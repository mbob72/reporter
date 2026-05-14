import { describe, expect, it } from 'vitest';

import { hasRoleAccess, isBuiltFile } from './report-http.helpers';

describe('hasRoleAccess', () => {
  it('supports hierarchy Auditor < Member < TenantAdmin < Admin', () => {
    expect(hasRoleAccess('Auditor', 'Auditor')).toBe(true);
    expect(hasRoleAccess('Member', 'Auditor')).toBe(true);
    expect(hasRoleAccess('TenantAdmin', 'Member')).toBe(true);
    expect(hasRoleAccess('Admin', 'TenantAdmin')).toBe(true);
  });

  it('returns false when role is below required minimum', () => {
    expect(hasRoleAccess('Auditor', 'Member')).toBe(false);
    expect(hasRoleAccess('Member', 'TenantAdmin')).toBe(false);
    expect(hasRoleAccess('TenantAdmin', 'Admin')).toBe(false);
  });
});

describe('isBuiltFile', () => {
  it('returns true for valid BuiltFile', () => {
    expect(
      isBuiltFile({
        fileName: 'report.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        bytes: new Uint8Array([1, 2, 3]),
      }),
    ).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isBuiltFile(null)).toBe(false);
    expect(isBuiltFile({})).toBe(false);
    expect(
      isBuiltFile({
        fileName: 'report.xlsx',
        mimeType: 'application/octet-stream',
        bytes: [1, 2, 3],
      }),
    ).toBe(false);
  });
});
