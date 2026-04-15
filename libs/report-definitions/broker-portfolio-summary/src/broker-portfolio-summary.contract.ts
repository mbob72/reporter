import { z } from 'zod';

import { BrokerCredentialInputSchema } from '@report-platform/contracts';

export const BrokerPortfolioSummaryParamsSchema = z.object({
  accountId: z.string().trim().min(1),
  credentials: BrokerCredentialInputSchema,
});

export const BrokerPortfolioSummaryResultSchema = z.object({
  owner: z.string().min(1),
  accountId: z.string().min(1),
  totalMarketValue: z.number(),
  tradeCount: z.number(),
});

export type BrokerPortfolioSummaryParams = z.infer<
  typeof BrokerPortfolioSummaryParamsSchema
>;
export type BrokerPortfolioSummaryResult = z.infer<
  typeof BrokerPortfolioSummaryResultSchema
>;
