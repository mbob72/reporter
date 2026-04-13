import type { ApiError, CurrentUser } from '@report-platform/contracts';
import type { SalesRepository, TenantRepository } from '@report-platform/data-access';
import type { ReportDefinition } from '@report-platform/registry';

import {
  SimpleSalesSummaryParamsSchema,
  SimpleSalesSummaryResultSchema,
  type SimpleSalesSummaryResult,
} from './simple-sales-summary.contract';
import { SimpleSalesSummaryService } from './simple-sales-summary.service';

export const SIMPLE_SALES_SUMMARY_REPORT_CODE = 'simple-sales-summary';

type CreateSimpleSalesSummaryDefinitionOptions = {
  tenantRepository: TenantRepository;
  salesRepository: SalesRepository;
};

function throwValidationError(): never {
  throw {
    code: 'VALIDATION_ERROR',
    message: 'Invalid report params.',
  } satisfies ApiError;
}

export function createSimpleSalesSummaryDefinition(
  options: CreateSimpleSalesSummaryDefinitionOptions,
): ReportDefinition<SimpleSalesSummaryResult> {
  const service = new SimpleSalesSummaryService(
    options.tenantRepository,
    options.salesRepository,
  );

  return {
    code: SIMPLE_SALES_SUMMARY_REPORT_CODE,
    title: 'Simple Sales Summary',
    description: 'Shows tenant, organization, and current sales amount.',
    async launch(
      currentUser: CurrentUser,
      params: unknown,
    ): Promise<SimpleSalesSummaryResult> {
      const parsedParams = SimpleSalesSummaryParamsSchema.safeParse(params);

      if (!parsedParams.success) {
        throwValidationError();
      }

      const reportResult = await service.run(currentUser, parsedParams.data);
      const parsedResult = SimpleSalesSummaryResultSchema.safeParse(reportResult);

      if (!parsedResult.success) {
        throw new Error('Invalid report response.');
      }

      return parsedResult.data;
    },
  };
}
