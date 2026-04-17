import { z } from 'zod';

export const SimpleSalesSummaryXlsxParamsSchema = z.object({});

export type SimpleSalesSummaryXlsxParams = z.infer<
  typeof SimpleSalesSummaryXlsxParamsSchema
>;
