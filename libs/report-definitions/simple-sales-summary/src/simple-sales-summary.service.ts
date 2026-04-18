import { resolve } from 'node:path';

import type { ApiError, CurrentUser } from '@report-platform/contracts';
import { fillTemplateWorkbook, type BuiltFile } from '@report-platform/xlsx';

import { fillSummarySheet } from './simple-sales-summary.template';
import type { SimpleSalesSummarySourceService } from './simple-sales-summary.source';

const TEMPLATE_PATH =
  'libs/report-definitions/simple-sales-summary/template-assets/simple-sales-summary-template.xlsx';

function throwValidationError(message: string): never {
  throw {
    code: 'VALIDATION_ERROR',
    message,
  } satisfies ApiError;
}

export class SimpleSalesSummaryService {
  constructor(
    private readonly sourceService: SimpleSalesSummarySourceService,
    private readonly templatePath = TEMPLATE_PATH,
  ) {}

  async run(currentUser: CurrentUser): Promise<BuiltFile> {
    const source = await this.sourceService.getSource(currentUser);
    // Weather fallback policy is resolved in source service; template fill is deterministic here.
    const outputFileName = `simple-sales-summary-${source.tenantId}-${source.organizationId}.xlsx`;

    try {
      const { builtFile } = await fillTemplateWorkbook({
        templatePath: resolve(this.templatePath),
        outputFileName,
        fillWorkbook(workbook) {
          fillSummarySheet(workbook, source);
        },
      });

      return builtFile;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('XLSX template file not found:') ||
          error.message.startsWith('LibreOffice executable not found.') ||
          error.message.startsWith('Failed to read XLSX template file:') ||
          error.message.startsWith('Failed to open recalculated XLSX file:') ||
          error.message.startsWith('LibreOffice recalculation failed') ||
          error.message.startsWith('Missing worksheet in template:'))
      ) {
        throwValidationError(error.message);
      }

      throw error;
    }
  }
}
