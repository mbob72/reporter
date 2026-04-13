import { z } from 'zod';

export const SimpleSalesSummaryParamsSchema = z.object({
  tenant: z.string().trim().min(1),
  organization: z.string().trim().min(1),
});

export const SimpleSalesSummaryResultSchema = z.object({
  tenantName: z.string().min(1),
  organizationName: z.string().min(1),
  currentSalesAmount: z.number(),
});

export type SimpleSalesSummaryParams = z.infer<typeof SimpleSalesSummaryParamsSchema>;
export type SimpleSalesSummaryResult = z.infer<typeof SimpleSalesSummaryResultSchema>;
