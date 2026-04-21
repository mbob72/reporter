import { z } from 'zod';

import { DownloadableFileResultSchema } from './downloadable-file.contract';

export const ReportInstanceStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
]);

export const ReportInstanceStageSchema = z.enum([
  'queued',
  'preparing',
  'generating',
  'storing-result',
  'done',
  'failed',
]);

export const ReportLaunchAcceptedSchema = z.object({
  reportInstanceId: z.string().trim().min(1),
  status: z.literal('queued'),
});

export const ReportInstanceSchema = z.object({
  id: z.string().trim().min(1),
  reportCode: z.string().trim().min(1),
  status: ReportInstanceStatusSchema,
  stage: ReportInstanceStageSchema,
  progressPercent: z.number().min(0).max(100),
  createdAt: z.string().trim().min(1),
  startedAt: z.string().trim().min(1).optional(),
  finishedAt: z.string().trim().min(1).optional(),
  result: DownloadableFileResultSchema.optional(),
  errorMessage: z.string().trim().min(1).optional(),
  artifactId: z.string().trim().min(1).optional(),
  fileName: z.string().trim().min(1).optional(),
  byteLength: z.number().int().nonnegative().optional(),
});

export const ReportInstanceListItemSchema = z.object({
  id: z.string().trim().min(1),
  reportCode: z.string().trim().min(1),
  status: ReportInstanceStatusSchema,
  createdAt: z.string().trim().min(1),
  finishedAt: z.string().trim().min(1).optional(),
  fileName: z.string().trim().min(1).optional(),
  byteLength: z.number().int().nonnegative().optional(),
  downloadUrl: z.string().trim().min(1).optional(),
});

export const ReportInstanceListResponseSchema = z.array(
  ReportInstanceListItemSchema,
);

export type ReportInstanceStatus = z.infer<typeof ReportInstanceStatusSchema>;
export type ReportInstanceStage = z.infer<typeof ReportInstanceStageSchema>;
export type ReportLaunchAccepted = z.infer<typeof ReportLaunchAcceptedSchema>;
export type ReportInstance = z.infer<typeof ReportInstanceSchema>;
export type ReportInstanceListItem = z.infer<typeof ReportInstanceListItemSchema>;
export type ReportInstanceListResponse = z.infer<
  typeof ReportInstanceListResponseSchema
>;
