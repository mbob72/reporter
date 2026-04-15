export type BrokerPortfolioDto = {
  accountId: string;
  owner: string;
  totalMarketValue: number;
  currency: 'USD';
};

export type BrokerTradeDto = {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
};

export interface BrokerApiClient {
  getPortfolio(params: { accountId: string }): Promise<BrokerPortfolioDto>;
  getTrades(params: { accountId: string }): Promise<BrokerTradeDto[]>;
}

function resolveOwner(accessToken: string): string {
  const tokenPrefix = 'broker-token:';

  if (!accessToken.startsWith(tokenPrefix)) {
    return 'unknown-owner';
  }

  const owner = accessToken.slice(tokenPrefix.length).trim();
  return owner || 'unknown-owner';
}

export class MockBrokerApiClient implements BrokerApiClient {
  private readonly owner: string;

  constructor(private readonly accessToken: string) {
    this.owner = resolveOwner(accessToken);
  }

  async getPortfolio(params: { accountId: string }): Promise<BrokerPortfolioDto> {
    return {
      owner: this.owner,
      accountId: params.accountId,
      totalMarketValue: params.accountId.length * 2100 + this.owner.length * 175,
      currency: 'USD',
    };
  }

  async getTrades(params: { accountId: string }): Promise<BrokerTradeDto[]> {
    const accountKey = params.accountId.replace(/\s+/g, '').toUpperCase() || 'ACC';

    return [
      {
        id: `${accountKey}-TR-1`,
        symbol: 'AAPL',
        side: 'buy',
        quantity: 8,
      },
      {
        id: `${accountKey}-TR-2`,
        symbol: 'MSFT',
        side: 'sell',
        quantity: 3,
      },
      {
        id: `${accountKey}-TR-3`,
        symbol: 'NVDA',
        side: 'buy',
        quantity: 1,
      },
    ];
  }
}
