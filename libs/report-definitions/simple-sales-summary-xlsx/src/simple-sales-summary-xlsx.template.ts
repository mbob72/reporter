import type { XlsxSheet, XlsxWorkbook } from '@report-platform/xlsx';

import type {
  ChannelTemplateRow,
  ProductTemplateRow,
} from '@report-platform/data-access';

const PRODUCTS_SHEET_NAME = 'Products';
const CHANNELS_SHEET_NAME = 'Channels';
const CROSS_JOIN_SHEET_NAME = 'CrossJoin';

const PRODUCTS_DATA_START_ROW = 4;
const CHANNELS_DATA_START_ROW = 4;
const CROSS_JOIN_DATA_START_ROW = 4;
const CROSS_JOIN_ROW_COUNT = 6;
const CLEAR_TO_ROW = 200;

export type CrossJoinRow = {
  product: string;
  channel: string;
  adjustedPrice: number;
  forecastUnits: number;
  expectedGrossProfit: number;
};

function getSheet(workbook: XlsxWorkbook, sheetName: string) {
  const sheet = workbook.sheet(sheetName);

  if (!sheet) {
    throw new Error(`Missing worksheet in template: ${sheetName}`);
  }

  return sheet;
}

function clearRange(
  sheet: XlsxSheet,
  columns: readonly string[],
  startRow: number,
  endRow: number,
) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (const column of columns) {
      sheet.cell(`${column}${row}`).value(undefined);
    }
  }
}

function toNumericCell(value: unknown, cellAddress: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();

    if (normalizedValue.length > 0) {
      const parsedValue = Number(normalizedValue);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  throw new Error(`Expected numeric value in cell ${cellAddress}.`);
}

function toStringCell(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

export function fillProductsSheet(
  workbook: XlsxWorkbook,
  products: ProductTemplateRow[],
) {
  const sheet = getSheet(workbook, PRODUCTS_SHEET_NAME);

  clearRange(sheet, ['A', 'B', 'C'], PRODUCTS_DATA_START_ROW, CLEAR_TO_ROW);

  products.forEach((row, index) => {
    const targetRow = PRODUCTS_DATA_START_ROW + index;

    sheet.cell(`A${targetRow}`).value(row.productName);
    sheet.cell(`B${targetRow}`).value(row.basePrice);
    sheet.cell(`C${targetRow}`).value(row.baseUnits);
    // Keep base units in D as well because the template layout expects units there.
    sheet.cell(`D${targetRow}`).value(row.baseUnits);
  });
}

export function fillChannelsSheet(
  workbook: XlsxWorkbook,
  channels: ChannelTemplateRow[],
) {
  const sheet = getSheet(workbook, CHANNELS_SHEET_NAME);

  clearRange(sheet, ['A', 'B', 'C', 'D', 'E'], CHANNELS_DATA_START_ROW, CLEAR_TO_ROW);

  channels.forEach((row, index) => {
    const targetRow = CHANNELS_DATA_START_ROW + index;

    sheet.cell(`A${targetRow}`).value(row.channelName);
    sheet.cell(`B${targetRow}`).value(row.priceMultiplier);
    sheet.cell(`C${targetRow}`).value(row.volumeMultiplier);
    sheet.cell(`D${targetRow}`).value(row.channelFeeRate);
    // Keep fee in E too, matching the legacy template visible column usage.
    sheet.cell(`E${targetRow}`).value(row.channelFeeRate);
  });
}

export function fillCrossJoinSheet(
  workbook: XlsxWorkbook,
) {
  // CrossJoin formulas are owned by the template and must not be rewritten here.
  getSheet(workbook, CROSS_JOIN_SHEET_NAME);
}

export function readCrossJoinRows(
  workbook: XlsxWorkbook,
  rowCount = CROSS_JOIN_ROW_COUNT,
): CrossJoinRow[] {
  const sheet = getSheet(workbook, CROSS_JOIN_SHEET_NAME);
  const rows: CrossJoinRow[] = [];

  for (let rowOffset = 0; rowOffset < rowCount; rowOffset += 1) {
    const targetRow = CROSS_JOIN_DATA_START_ROW + rowOffset;

    rows.push({
      product: toStringCell(sheet.cell(`A${targetRow}`).value()),
      channel: toStringCell(sheet.cell(`E${targetRow}`).value()),
      adjustedPrice: toNumericCell(
        sheet.cell(`J${targetRow}`).value(),
        `J${targetRow}`,
      ),
      forecastUnits: toNumericCell(
        sheet.cell(`K${targetRow}`).value(),
        `K${targetRow}`,
      ),
      expectedGrossProfit: toNumericCell(
        sheet.cell(`L${targetRow}`).value(),
        `L${targetRow}`,
      ),
    });
  }

  return rows;
}
