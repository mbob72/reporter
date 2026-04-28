import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
} from '@report-platform/contracts';

import { SimpleSalesSummaryStep2 } from './components/SimpleSalesSummaryStep2';
import { SimpleSalesSummaryXlsxStep2 } from './components/SimpleSalesSummaryXlsxStep2';

export const reportStep2Registry = {
  [SIMPLE_SALES_SUMMARY_REPORT_CODE]: SimpleSalesSummaryStep2,
  [SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE]: SimpleSalesSummaryXlsxStep2,
} as const;
