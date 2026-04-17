import { z } from 'zod';

export const SimpleSalesSummaryParamsSchema = z.object({});

export const SimpleSalesSummarySourceSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().min(1),
  tenantName: z.string().min(1),
  organizationName: z.string().min(1),
  currentSalesAmount: z.number(),
  currency: z.literal('USD'),
});

export const SimpleSalesSummaryResultSchema = z.object({
  tenantName: z.string().min(1),
  organizationName: z.string().min(1),
  currentSalesAmount: z.number(),
});

export type SimpleSalesSummaryParams = z.infer<typeof SimpleSalesSummaryParamsSchema>;
export type SimpleSalesSummarySource = z.infer<typeof SimpleSalesSummarySourceSchema>;
export type SimpleSalesSummaryResult = z.infer<typeof SimpleSalesSummaryResultSchema>;
