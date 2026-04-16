import type {
  ApiError,
  CurrentUser,
  ReportMetadata,
} from '@report-platform/contracts';
import type { XlsxBinaryWriter } from '@report-platform/xlsx';
import type { ReportDefinition } from '@report-platform/registry';

import {
  MockSalesCommissionXlsxParamsSchema,
  MockSalesCommissionXlsxResultSchema,
  type MockSalesCommissionXlsxResult,
} from './mock-sales-commission-xlsx.contract';
import { buildMockCommissionWorkbook } from './mock-sales-commission-xlsx.builder';
import { mockSalesCommissionXlsxInput } from './mock-sales-commission-xlsx.mocks';

export const MOCK_SALES_COMMISSION_XLSX_REPORT_CODE =
  'mock-sales-commission-xlsx';

type CreateMockSalesCommissionXlsxDefinitionOptions = {
  defaultInput?: unknown;
  xlsxWriter?: XlsxBinaryWriter;
};

function throwValidationError(message: string): never {
  throw {
    code: 'VALIDATION_ERROR',
    message,
  } satisfies ApiError;
}

const reportMetadata: ReportMetadata = {
  code: MOCK_SALES_COMMISSION_XLSX_REPORT_CODE,
  title: 'Mock Sales Commission XLSX',
  description:
    'Builds a 3-sheet workbook model (Orders, CommissionRules, CommissionReport) and mock XLSX bytes.',
  minRoleToLaunch: 'TenantAdmin',
  fields: [],
  externalDependencies: [],
};

export function createMockSalesCommissionXlsxDefinition(
  options: CreateMockSalesCommissionXlsxDefinitionOptions = {},
): ReportDefinition<MockSalesCommissionXlsxResult> {
  return {
    code: reportMetadata.code,
    title: reportMetadata.title,
    description: reportMetadata.description,
    getMetadata(_currentUser: CurrentUser): ReportMetadata {
      return reportMetadata;
    },
    async launch(
      _currentUser: CurrentUser,
      params: unknown,
    ): Promise<MockSalesCommissionXlsxResult> {
      const parsedParams = MockSalesCommissionXlsxParamsSchema.safeParse(params);

      if (!parsedParams.success) {
        throwValidationError('Invalid report params.');
      }

      const input =
        parsedParams.data.input ?? options.defaultInput ?? mockSalesCommissionXlsxInput;
      const buildResult = await buildMockCommissionWorkbook(input, options.xlsxWriter);

      const resultCandidate: MockSalesCommissionXlsxResult = {
        workbookMetadata: buildResult.workbookMetadata,
        workbookModel: buildResult.workbookModel,
        builtFile: {
          fileName: buildResult.builtFile.fileName,
          mimeType: buildResult.builtFile.mimeType,
          byteLength: buildResult.builtFile.bytes.byteLength,
        },
      };

      const parsedResult = MockSalesCommissionXlsxResultSchema.safeParse(
        resultCandidate,
      );

      if (!parsedResult.success) {
        throw new Error('Invalid report response.');
      }

      return parsedResult.data;
    },
  };
}
