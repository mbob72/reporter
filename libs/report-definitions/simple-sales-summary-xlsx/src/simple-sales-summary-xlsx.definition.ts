import { resolve } from 'node:path';

import type {
  ApiError,
  CurrentUser,
  ReportMetadata,
} from '@report-platform/contracts';
import type {
  ChannelsRepository,
  ProductsRepository,
} from '@report-platform/data-access';
import type { ReportDefinition } from '@report-platform/registry';
import { fillTemplateWorkbook, type BuiltFile } from '@report-platform/xlsx';

import { SimpleSalesSummaryXlsxParamsSchema } from './simple-sales-summary-xlsx.contract';
import {
  type SimpleSalesSummaryXlsxDatasetRotation,
  SimpleSalesSummaryXlsxSourceService,
} from './simple-sales-summary-xlsx.source';
import {
  fillChannelsSheet,
  fillCrossJoinSheet,
  fillProductsSheet,
  readCrossJoinRows,
} from './simple-sales-summary-xlsx.template';

export const SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE = 'simple-sales-summary-xlsx';

const TEMPLATE_PATH =
  'libs/report-definitions/simple-sales-summary-xlsx/template-assets/pelmeni-cross-join-template.xlsx';

const reportMetadata: ReportMetadata = {
  code: SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
  title: 'Pelmeni Product × Channel Matrix XLSX',
  description:
    'Template-based XLSX report built from products and channel scenarios with recalculated formulas.',
  minRoleToLaunch: 'TenantAdmin',
  fields: [],
  externalDependencies: [],
};

type CreateSimpleSalesSummaryXlsxDefinitionOptions = {
  productsRepository: ProductsRepository;
  channelsRepository: ChannelsRepository;
  datasetRotation: SimpleSalesSummaryXlsxDatasetRotation;
  templatePath?: string;
};

function throwValidationError(message: string): never {
  throw {
    code: 'VALIDATION_ERROR',
    message,
  } satisfies ApiError;
}

export function createSimpleSalesSummaryXlsxDefinition(
  options: CreateSimpleSalesSummaryXlsxDefinitionOptions,
): ReportDefinition<BuiltFile> {
  const sourceService = new SimpleSalesSummaryXlsxSourceService(
    options.productsRepository,
    options.channelsRepository,
    options.datasetRotation,
  );

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
      launchOptions,
    ): Promise<BuiltFile> {
      const parsedParams = SimpleSalesSummaryXlsxParamsSchema.safeParse(params);

      if (!parsedParams.success) {
        throwValidationError('Invalid report params.');
      }

      const source = await sourceService.getSource(currentUser, {
        datasetKey: parsedParams.data.datasetKey,
      });
      launchOptions?.onProgress?.(60);
      const templatePath = resolve(options.templatePath ?? TEMPLATE_PATH);
      const outputFileName = `sales-channel-matrix-${source.datasetKey}.xlsx`;

      let builtFile: BuiltFile;

      try {
        const result = await fillTemplateWorkbook({
          templatePath,
          outputFileName,
          fillWorkbook(workbook) {
            fillProductsSheet(workbook, source.products);
            fillChannelsSheet(workbook, source.channels);
            fillCrossJoinSheet(workbook);
          },
          readCalculated(workbook) {
            return readCrossJoinRows(
              workbook,
              source.products.length * source.channels.length,
            );
          },
        });

        builtFile = result.builtFile;
        launchOptions?.onProgress?.(90);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.startsWith('XLSX template file not found:') ||
            error.message.startsWith('LibreOffice executable not found.') ||
            error.message.startsWith('Failed to read XLSX template file:') ||
            error.message.startsWith('Failed to open recalculated XLSX file:') ||
            error.message.startsWith('LibreOffice recalculation failed'))
        ) {
          throwValidationError(error.message);
        }

        throw error;
      }

      return builtFile;
    },
  };
}
