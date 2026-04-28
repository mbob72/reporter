import { z } from 'zod';

export const SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE = 'simple-sales-summary-xlsx';

export const SimpleSalesSummaryXlsxLaunchParamsSchema = z.object({
  datasetKey: z.string().trim().min(1).optional(),
});

export type SimpleSalesSummaryXlsxLaunchParams = z.infer<
  typeof SimpleSalesSummaryXlsxLaunchParamsSchema
>;
