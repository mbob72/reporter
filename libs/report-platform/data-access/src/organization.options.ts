export type OrganizationOption = {
  id: string;
  name: string;
  tenantId: string;
};

const organizationOptions: OrganizationOption[] = [
  { id: 'org-1', name: 'Acme North', tenantId: 'tenant-1' },
  { id: 'org-2', name: 'Acme South', tenantId: 'tenant-1' },
  { id: 'org-3', name: 'Globex Main', tenantId: 'tenant-2' },
];

export function getOrganizationsByTenant(tenantId: string): OrganizationOption[] {
  return organizationOptions.filter((organizationOption) => organizationOption.tenantId === tenantId);
}
