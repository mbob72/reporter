import { z } from 'zod';

export const SIMPLE_SALES_SUMMARY_WEATHER_FALLBACK = '!error!';

export const SimpleSalesSummarySourceSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().min(1),
  tenantName: z.string().min(1),
  organizationName: z.string().min(1),
  currentSalesAmount: z.number().finite(),
  currency: z.literal('USD'),
  airTemperatureDisplay: z.string().trim().min(1),
});

export type SimpleSalesSummarySource = z.infer<typeof SimpleSalesSummarySourceSchema>;
