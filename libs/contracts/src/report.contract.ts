import { z } from 'zod';

export const LaunchSimpleReportRequestSchema = z.object({
  tenantId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
});

export const SimpleReportResponseSchema = z.object({
  tenantName: z.string().min(1),
  organizationName: z.string().min(1),
  currentSalesAmount: z.number(),
});

export type LaunchSimpleReportRequest = z.infer<typeof LaunchSimpleReportRequestSchema>;
export type SimpleReportResponse = z.infer<typeof SimpleReportResponseSchema>;
