import type {
  ApiError,
  CurrentUser,
  ReportMetadata,
} from '@report-platform/contracts';
import type { SalesRepository, TenantRepository } from '@report-platform/data-access';
import type { ReportDefinition } from '@report-platform/registry';
import {
  makeXlsxFile,
  mockXlsxWriter,
  type BuiltFile,
  type XlsxBinaryWriter,
} from '@report-platform/xlsx';

import { SimpleSalesSummaryService } from '@report-definitions/simple-sales-summary';

import { buildSimpleSalesSummaryWorkbook } from './simple-sales-summary-xlsx.builder';
import {
  SimpleSalesSummaryXlsxParamsSchema,
  SimpleSalesSummaryXlsxWorkbookMetadataSchema,
  type SimpleSalesSummaryXlsxInternalResult,
} from './simple-sales-summary-xlsx.contract';

export const SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE = 'simple-sales-summary-xlsx';

type CreateSimpleSalesSummaryXlsxDefinitionOptions = {
  tenantRepository: TenantRepository;
  salesRepository: SalesRepository;
  xlsxWriter?: XlsxBinaryWriter;
};

function throwValidationError(message: string): never {
  throw {
    code: 'VALIDATION_ERROR',
    message,
  } satisfies ApiError;
}

const reportMetadata: ReportMetadata = {
  code: SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
  title: 'Simple Sales Summary XLSX',
  description: 'Builds a workbook and returns a downloadable file artifact.',
  minRoleToLaunch: 'TenantAdmin',
  fields: [],
  externalDependencies: [],
};

export function createSimpleSalesSummaryXlsxDefinition(
  options: CreateSimpleSalesSummaryXlsxDefinitionOptions,
): ReportDefinition<BuiltFile> {
  const service = new SimpleSalesSummaryService(
    options.tenantRepository,
    options.salesRepository,
  );

  return {
    code: reportMetadata.code,
    title: reportMetadata.title,
    description: reportMetadata.description,
    getMetadata(_currentUser: CurrentUser): ReportMetadata {
      return reportMetadata;
    },
    async launch(currentUser: CurrentUser, params: unknown): Promise<BuiltFile> {
      const parsedParams = SimpleSalesSummaryXlsxParamsSchema.safeParse(params);

      if (!parsedParams.success) {
        throwValidationError('Invalid report params.');
      }

      const source = await service.getSource(currentUser);
      const { workbookMetadata, workbookModel } =
        buildSimpleSalesSummaryWorkbook(source);
      const parsedWorkbookMetadata =
        SimpleSalesSummaryXlsxWorkbookMetadataSchema.safeParse(workbookMetadata);

      if (!parsedWorkbookMetadata.success) {
        throw new Error('Invalid workbook metadata.');
      }

      const builtFile = await makeXlsxFile(
        workbookModel,
        options.xlsxWriter ?? mockXlsxWriter,
      );
      const internalResult: SimpleSalesSummaryXlsxInternalResult = {
        workbookMetadata: parsedWorkbookMetadata.data,
        builtFile,
      };

      return internalResult.builtFile;
    },
  };
}
