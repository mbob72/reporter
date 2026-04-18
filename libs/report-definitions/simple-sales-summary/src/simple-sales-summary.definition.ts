import type {
  ApiError,
  CurrentUser,
  ReportMetadata,
} from '@report-platform/contracts';
import type { SalesRepository, TenantRepository } from '@report-platform/data-access';
import type { ExternalClientFactory } from '@report-platform/external-api';
import type { ReportDefinition } from '@report-platform/registry';
import type { BuiltFile } from '@report-platform/xlsx';

import { SimpleSalesSummaryParamsSchema } from './simple-sales-summary.contract';
import { SimpleSalesSummaryService } from './simple-sales-summary.service';
import { SimpleSalesSummarySourceService } from './simple-sales-summary.source';

export const SIMPLE_SALES_SUMMARY_REPORT_CODE = 'simple-sales-summary';

type CreateSimpleSalesSummaryDefinitionOptions = {
  tenantRepository: TenantRepository;
  salesRepository: SalesRepository;
  externalClientFactory: ExternalClientFactory;
  templatePath?: string;
};

const reportMetadata: ReportMetadata = {
  code: SIMPLE_SALES_SUMMARY_REPORT_CODE,
  title: 'Simple Sales Summary XLSX',
  description:
    'Template-based XLSX with tenant, organization, current sales, and current air temperature.',
  minRoleToLaunch: 'TenantAdmin',
  fields: [],
  externalDependencies: [
    {
      serviceKey: 'openWeather',
      authMode: 'api_key',
      minRoleToUse: 'TenantAdmin',
    },
  ],
};

function throwValidationError(message: string): never {
  throw {
    code: 'VALIDATION_ERROR',
    message,
  } satisfies ApiError;
}

export function createSimpleSalesSummaryDefinition(
  options: CreateSimpleSalesSummaryDefinitionOptions,
): ReportDefinition<BuiltFile> {
  return {
    code: reportMetadata.code,
    title: reportMetadata.title,
    description: reportMetadata.description,
    getMetadata(_currentUser: CurrentUser): ReportMetadata {
      return reportMetadata;
    },
    async launch(currentUser: CurrentUser, params: unknown): Promise<BuiltFile> {
      const parsedParams = SimpleSalesSummaryParamsSchema.safeParse(params);

      if (!parsedParams.success) {
        throwValidationError('Invalid report params.');
      }

      const openWeatherClient = await options.externalClientFactory.getOpenWeatherClient(
        {
          currentUser,
          reportMetadata,
          reportCode: reportMetadata.code,
          credentialInput: parsedParams.data.credentials,
        },
      );
      const sourceService = new SimpleSalesSummarySourceService(
        options.tenantRepository,
        options.salesRepository,
        openWeatherClient,
      );
      const reportService = new SimpleSalesSummaryService(
        sourceService,
        options.templatePath,
      );

      return reportService.run(currentUser);
    },
  };
}
