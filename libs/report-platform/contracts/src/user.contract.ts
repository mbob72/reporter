import { z } from 'zod';

import { RoleSchema } from './roles.contract';

export const CurrentUserSchema = z.object({
  userId: z.string().min(1),
  role: RoleSchema,
  tenantId: z.string().min(1).nullable(),
  organizationId: z.string().min(1).nullable(),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;
