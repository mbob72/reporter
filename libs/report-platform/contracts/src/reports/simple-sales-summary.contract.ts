import { z } from 'zod';

export const SIMPLE_SALES_SUMMARY_REPORT_CODE = 'simple-sales-summary';

export const OpenWeatherCredentialInputSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('manual'),
    apiKey: z.string().trim().min(1),
  }),
  z.object({
    mode: z.literal('shared_setting'),
    sharedSettingId: z.string().trim().min(1),
  }),
]);

export const SimpleSalesSummaryLaunchParamsSchema = z.object({
  tenantId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  credentials: OpenWeatherCredentialInputSchema,
});

export type OpenWeatherCredentialInput = z.infer<typeof OpenWeatherCredentialInputSchema>;
export type SimpleSalesSummaryLaunchParams = z.infer<typeof SimpleSalesSummaryLaunchParamsSchema>;
