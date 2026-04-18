import { z } from 'zod';

export const SimpleSalesSummaryXlsxParamsSchema = z.object({
  datasetKey: z.string().trim().min(1).optional(),
});

export type SimpleSalesSummaryXlsxParams = z.infer<
  typeof SimpleSalesSummaryXlsxParamsSchema
>;
