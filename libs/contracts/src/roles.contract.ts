import { z } from 'zod';

export const RoleSchema = z.enum(['Admin', 'TenantAdmin', 'Member', 'Auditor']);

export type Role = z.infer<typeof RoleSchema>;
