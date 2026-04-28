import type {
  CurrentUser,
  ReportMetadata,
  SimpleSalesSummaryLaunchParams,
} from '@report-platform/contracts';
import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SimpleSalesSummaryLaunchParamsSchema,
} from '@report-platform/contracts';
import type { SalesRepository, TenantRepository } from '@report-platform/data-access';
import type { ExternalClientFactory } from '@report-platform/external-api';
import type { ReportDefinition } from '@report-platform/registry';
import type { BuiltFile } from '@report-platform/xlsx';

import { SimpleSalesSummaryService } from './simple-sales-summary.service';
import { SimpleSalesSummarySourceService } from './simple-sales-summary.source';

export { SIMPLE_SALES_SUMMARY_REPORT_CODE };

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
  externalDependencies: [
    {
      serviceKey: 'openWeather',
      authMode: 'api_key',
      minRoleToUse: 'TenantAdmin',
    },
  ],
};

export function createSimpleSalesSummaryDefinition(
  options: CreateSimpleSalesSummaryDefinitionOptions,
): ReportDefinition<SimpleSalesSummaryLaunchParams, BuiltFile> {
  return {
    code: reportMetadata.code,
    title: reportMetadata.title,
    description: reportMetadata.description,
    launchParamsSchema: SimpleSalesSummaryLaunchParamsSchema,
    getMetadata(_currentUser: CurrentUser): ReportMetadata {
      return reportMetadata;
    },
    async launch(
      currentUser: CurrentUser,
      params: SimpleSalesSummaryLaunchParams,
      launchOptions,
    ): Promise<BuiltFile> {
      const openWeatherClient = await options.externalClientFactory.getOpenWeatherClient({
        currentUser,
        reportMetadata,
        reportCode: reportMetadata.code,
        credentialInput: params.credentials,
      });
      const sourceService = new SimpleSalesSummarySourceService(
        options.tenantRepository,
        options.salesRepository,
        openWeatherClient,
      );
      const reportService = new SimpleSalesSummaryService(sourceService, options.templatePath);

      const builtFile = await reportService.run(currentUser, {
        tenantId: params.tenantId,
        organizationId: params.organizationId,
        onSourceLoaded() {
          launchOptions?.onProgress?.(60);
        },
        onRecalculated() {
          launchOptions?.onProgress?.(90);
        },
      });

      return builtFile;
    },
  };
}
