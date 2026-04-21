import { z } from 'zod';

import { RoleSchema } from './roles.contract';

export const ReportListItemSchema = z.object({
  code: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  minRoleToLaunch: RoleSchema,
});

export const ReportListResponseSchema = z.array(ReportListItemSchema);

export type ReportListItem = z.infer<typeof ReportListItemSchema>;
export type ReportListResponse = z.infer<typeof ReportListResponseSchema>;
