import { z } from 'zod';

import { DownloadableFileResultSchema } from './downloadable-file.contract';

export const ReportJobStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
]);

export const ReportJobStageSchema = z.enum([
  'queued',
  'preparing',
  'generating',
  'storing-result',
  'done',
  'failed',
]);

export const ReportJobAcceptedSchema = z.object({
  jobId: z.string().trim().min(1),
  status: z.literal('queued'),
});

export const ReportJobStatusResponseSchema = z.object({
  jobId: z.string().trim().min(1),
  reportCode: z.string().trim().min(1),
  status: ReportJobStatusSchema,
  stage: ReportJobStageSchema,
  progressPercent: z.number().min(0).max(100),
  createdAt: z.string().trim().min(1),
  startedAt: z.string().trim().min(1).optional(),
  finishedAt: z.string().trim().min(1).optional(),
  result: DownloadableFileResultSchema.optional(),
  errorMessage: z.string().trim().min(1).optional(),
});

export type ReportJobStatus = z.infer<typeof ReportJobStatusSchema>;
export type ReportJobStage = z.infer<typeof ReportJobStageSchema>;
export type ReportJobAccepted = z.infer<typeof ReportJobAcceptedSchema>;
export type ReportJobStatusResponse = z.infer<
  typeof ReportJobStatusResponseSchema
>;
