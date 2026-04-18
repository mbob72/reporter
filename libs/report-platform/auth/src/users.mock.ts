import type { CurrentUser } from '@report-platform/contracts';

export const mockUsers = {
  admin: {
    userId: 'admin',
    role: 'Admin',
    tenantId: null,
    organizationId: null,
  },
  'tenant-admin-1': {
    userId: 'tenant-admin-1',
    role: 'TenantAdmin',
    tenantId: 'tenant-1',
    organizationId: null,
  },
  'tenant-admin-2': {
    userId: 'tenant-admin-2',
    role: 'TenantAdmin',
    tenantId: 'tenant-2',
    organizationId: null,
  },
  'member-1': {
    userId: 'member-1',
    role: 'Member',
    tenantId: 'tenant-1',
    organizationId: null,
  },
  'auditor-1': {
    userId: 'auditor-1',
    role: 'Auditor',
    tenantId: 'tenant-1',
    organizationId: null,
  },
} as const satisfies Record<string, CurrentUser>;

export type MockUserId = keyof typeof mockUsers;
export type MockUser = CurrentUser;

export const DEFAULT_MOCK_USER_ID: MockUserId = 'tenant-admin-1';

export const mockUserOptions: Array<{ id: MockUserId; label: string }> = [
  { id: 'tenant-admin-1', label: 'TenantAdmin tenant-1' },
  { id: 'tenant-admin-2', label: 'TenantAdmin tenant-2' },
  { id: 'admin', label: 'Admin' },
  { id: 'member-1', label: 'Member tenant-1' },
  { id: 'auditor-1', label: 'Auditor tenant-1' },
];
