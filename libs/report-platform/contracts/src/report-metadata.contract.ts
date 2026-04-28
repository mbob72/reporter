import { z } from 'zod';

import { RoleSchema } from './roles.contract';

export const ReportExternalDependencySchema = z.object({
  serviceKey: z.string().trim().min(1),
  authMode: z.enum(['shared_secret', 'api_key']),
  minRoleToUse: RoleSchema,
});

export const ReportMetadataSchema = z.object({
  code: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  minRoleToLaunch: RoleSchema,
  externalDependencies: z.array(ReportExternalDependencySchema).default([]),
});

export type ReportExternalDependency = z.infer<typeof ReportExternalDependencySchema>;
export type ReportMetadata = z.infer<typeof ReportMetadataSchema>;
