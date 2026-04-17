import { z } from 'zod';

import type { BuiltFile } from '@report-platform/xlsx';

export const SimpleSalesSummaryXlsxParamsSchema = z.object({});

export const SimpleSalesSummaryXlsxWorkbookMetadataSchema = z.object({
  sheetNames: z.array(z.string().min(1)).min(2),
  reportCode: z.literal('simple-sales-summary-xlsx'),
  title: z.string().min(1),
});

export type SimpleSalesSummaryXlsxParams = z.infer<
  typeof SimpleSalesSummaryXlsxParamsSchema
>;
export type SimpleSalesSummaryXlsxWorkbookMetadata = z.infer<
  typeof SimpleSalesSummaryXlsxWorkbookMetadataSchema
>;

export type SimpleSalesSummaryXlsxInternalResult = {
  workbookMetadata: SimpleSalesSummaryXlsxWorkbookMetadata;
  builtFile: BuiltFile;
};
