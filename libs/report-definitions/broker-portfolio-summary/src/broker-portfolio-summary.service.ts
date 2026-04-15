import type { BrokerApiClient } from '@report-platform/external-api';

import type {
  BrokerPortfolioSummaryParams,
  BrokerPortfolioSummaryResult,
} from './broker-portfolio-summary.contract';

export class BrokerPortfolioSummaryService {
  constructor(private readonly brokerApiClient: BrokerApiClient) {}

  async run(
    params: BrokerPortfolioSummaryParams,
  ): Promise<BrokerPortfolioSummaryResult> {
    const [portfolio, trades] = await Promise.all([
      this.brokerApiClient.getPortfolio({ accountId: params.accountId }),
      this.brokerApiClient.getTrades({ accountId: params.accountId }),
    ]);

    return {
      owner: portfolio.owner,
      accountId: portfolio.accountId,
      totalMarketValue: portfolio.totalMarketValue,
      tradeCount: trades.length,
    };
  }
}
