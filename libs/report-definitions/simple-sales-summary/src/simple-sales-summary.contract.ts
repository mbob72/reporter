import { z } from 'zod';

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

export const SimpleSalesSummaryParamsSchema = z.object({
  credentials: OpenWeatherCredentialInputSchema,
});

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

export type OpenWeatherCredentialInput = z.infer<
  typeof OpenWeatherCredentialInputSchema
>;
export type SimpleSalesSummaryParams = z.infer<typeof SimpleSalesSummaryParamsSchema>;
export type SimpleSalesSummarySource = z.infer<typeof SimpleSalesSummarySourceSchema>;
