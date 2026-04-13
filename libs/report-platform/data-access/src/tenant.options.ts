export type TenantOption = {
  id: string;
  name: string;
};

const tenantOptions: TenantOption[] = [
  { id: 'tenant-1', name: 'Acme Tenant' },
  { id: 'tenant-2', name: 'Globex Tenant' },
];

export function getAllTenants(): TenantOption[] {
  return [...tenantOptions];
}
