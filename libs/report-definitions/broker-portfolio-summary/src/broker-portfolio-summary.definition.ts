import type {
  ApiError,
  CurrentUser,
  ReportMetadata,
} from '@report-platform/contracts';
import type { ExternalClientFactory } from '@report-platform/external-api';
import type { ReportDefinition } from '@report-platform/registry';

import {
  BrokerPortfolioSummaryParamsSchema,
  BrokerPortfolioSummaryResultSchema,
  type BrokerPortfolioSummaryResult,
} from './broker-portfolio-summary.contract';
import { BrokerPortfolioSummaryService } from './broker-portfolio-summary.service';

export const BROKER_PORTFOLIO_SUMMARY_REPORT_CODE = 'broker-portfolio-summary';

type CreateBrokerPortfolioSummaryDefinitionOptions = {
  externalClientFactory: ExternalClientFactory;
};

function throwValidationError(message: string): never {
  throw {
    code: 'VALIDATION_ERROR',
    message,
  } satisfies ApiError;
}

const reportMetadata: ReportMetadata = {
  code: BROKER_PORTFOLIO_SUMMARY_REPORT_CODE,
  title: 'Broker Portfolio Summary',
  description: 'Loads portfolio data from external broker API.',
  minRoleToLaunch: 'TenantAdmin',
  fields: [
    {
      name: 'accountId',
      label: 'Account ID',
      kind: 'text',
      required: true,
      source: 'input',
    },
  ],
  externalDependencies: [
    {
      serviceKey: 'brokerApi',
      authMode: 'shared_secret',
      minRoleToUse: 'TenantAdmin',
    },
  ],
};

export function createBrokerPortfolioSummaryDefinition(
  options: CreateBrokerPortfolioSummaryDefinitionOptions,
): ReportDefinition<BrokerPortfolioSummaryResult> {
  return {
    code: reportMetadata.code,
    title: reportMetadata.title,
    description: reportMetadata.description,
    getMetadata(_currentUser: CurrentUser): ReportMetadata {
      return reportMetadata;
    },
    async launch(
      currentUser: CurrentUser,
      params: unknown,
    ): Promise<BrokerPortfolioSummaryResult> {
      const parsedParams = BrokerPortfolioSummaryParamsSchema.safeParse(params);

      if (!parsedParams.success) {
        throwValidationError('Invalid report params.');
      }

      const brokerApiClient = await options.externalClientFactory.getBrokerApiClient({
        currentUser,
        reportMetadata,
        reportCode: reportMetadata.code,
        credentialInput: parsedParams.data.credentials,
      });

      const service = new BrokerPortfolioSummaryService(brokerApiClient);
      const reportResult = await service.run(parsedParams.data);
      const parsedResult = BrokerPortfolioSummaryResultSchema.safeParse(reportResult);

      if (!parsedResult.success) {
        throw new Error('Invalid report response.');
      }

      return parsedResult.data;
    },
  };
}
