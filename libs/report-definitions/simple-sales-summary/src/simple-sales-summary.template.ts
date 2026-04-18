import type { XlsxWorkbook } from '@report-platform/xlsx';

import type { SimpleSalesSummarySource } from './simple-sales-summary.contract';

const SUMMARY_SHEET_NAME = 'Summary';
const HEADER_ROW = 1;
const VALUE_ROW = 2;
const COLUMNS = ['A', 'B', 'C', 'D'] as const;
const CLEAR_TO_ROW = 10;

function getSummarySheet(workbook: XlsxWorkbook) {
  const sheet = workbook.sheet(SUMMARY_SHEET_NAME);

  if (!sheet) {
    throw new Error(`Missing worksheet in template: ${SUMMARY_SHEET_NAME}`);
  }

  return sheet;
}

function clearSummaryArea(workbook: XlsxWorkbook) {
  const summarySheet = getSummarySheet(workbook);

  for (let row = 1; row <= CLEAR_TO_ROW; row += 1) {
    for (const column of COLUMNS) {
      summarySheet.cell(`${column}${row}`).value(undefined);
    }
  }
}

export function fillSummarySheet(
  workbook: XlsxWorkbook,
  source: SimpleSalesSummarySource,
) {
  const summarySheet = getSummarySheet(workbook);

  clearSummaryArea(workbook);

  const headerValues = [
    'Tenant',
    'Organization',
    'Current sales',
    'Air temperature (°C)',
  ] as const;
  const rowValues = [
    source.tenantName,
    source.organizationName,
    source.currentSalesAmount,
    source.airTemperatureDisplay,
  ] as const;

  summarySheet.column('A').width(26);
  summarySheet.column('B').width(26);
  summarySheet.column('C').width(20);
  summarySheet.column('D').width(24);

  COLUMNS.forEach((column, index) => {
    const headerCell = summarySheet.cell(`${column}${HEADER_ROW}`);
    const valueCell = summarySheet.cell(`${column}${VALUE_ROW}`);

    headerCell.value(headerValues[index]);
    valueCell.value(rowValues[index]);

    headerCell.style({
      bold: true,
      horizontalAlignment: 'center',
      verticalAlignment: 'center',
      fill: 'F3F4F6',
      border: true,
    });

    valueCell.style({
      horizontalAlignment: 'center',
      verticalAlignment: 'center',
      border: true,
    });
  });

  summarySheet.cell('C2').style('numberFormat', '#,##0.00');
}
