import { z } from 'zod';

export const ReportCodeSchema = z.string().trim().min(1);

export const LaunchReportParamsSchema = z.record(z.string(), z.unknown());

export const LaunchReportBodySchema = z.object({
  params: LaunchReportParamsSchema,
});

export type ReportCode = z.infer<typeof ReportCodeSchema>;
export type LaunchReportParams = z.infer<typeof LaunchReportParamsSchema>;
export type LaunchReportBody = z.infer<typeof LaunchReportBodySchema>;
