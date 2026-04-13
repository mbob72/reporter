import { z } from 'zod';

import { RoleSchema } from './roles.contract';

export const ReportFieldKindSchema = z.enum(['tenant', 'organization', 'text']);
export const ReportFieldSourceSchema = z.enum(['select', 'user-context', 'input']);

export const ReportFieldMetadataSchema = z.object({
  name: z.string().trim().min(1),
  label: z.string().trim().min(1),
  kind: ReportFieldKindSchema,
  required: z.boolean(),
  source: ReportFieldSourceSchema,
});

export const ReportMetadataSchema = z.object({
  code: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  minRoleToLaunch: RoleSchema,
  fields: z.array(ReportFieldMetadataSchema),
});

export type ReportFieldKind = z.infer<typeof ReportFieldKindSchema>;
export type ReportFieldSource = z.infer<typeof ReportFieldSourceSchema>;
export type ReportFieldMetadata = z.infer<typeof ReportFieldMetadataSchema>;
export type ReportMetadata = z.infer<typeof ReportMetadataSchema>;
