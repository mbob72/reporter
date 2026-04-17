import type { CellModel, SheetModel, WorkbookModel } from './model';
import type { XlsxBinaryWriter } from './writer';

type ZipEntry = {
  path: string;
  data: Uint8Array;
};

type PositionedCell = {
  address: string;
  row: number;
  column: number;
  cell: CellModel;
};

const A1_ADDRESS_REGEX = /^([A-Z]{1,3})([1-9][0-9]{0,6})$/;
const textEncoder = new TextEncoder();
const crcTable = buildCrc32Table();

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((value & 1) === 1) {
        value = 0xedb88320 ^ (value >>> 1);
      } else {
        value >>>= 1;
      }
    }

    table[index] = value >>> 0;
  }

  return table;
}

function toUtf8(value: string): Uint8Array {
  return textEncoder.encode(value);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoTimestamp(now: Date): string {
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function writeUInt16LE(buffer: Uint8Array, offset: number, value: number) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
}

function writeUInt32LE(buffer: Uint8Array, offset: number, value: number) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
  buffer[offset + 2] = (value >>> 16) & 0xff;
  buffer[offset + 3] = (value >>> 24) & 0xff;
}

function getDosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const dosTime = (hours << 11) | (minutes << 5) | Math.floor(seconds / 2);
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;

  return { dosTime, dosDate };
}

function crc32(data: Uint8Array): number {
  let checksum = 0xffffffff;

  for (const byte of data) {
    checksum = crcTable[(checksum ^ byte) & 0xff] ^ (checksum >>> 8);
  }

  return (checksum ^ 0xffffffff) >>> 0;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }

  return merged;
}

function zipStore(entries: ZipEntry[], now: Date): Uint8Array {
  const localAndDataParts: Uint8Array[] = [];
  const centralDirectoryParts: Uint8Array[] = [];
  let offset = 0;
  const { dosTime, dosDate } = getDosDateTime(now);

  for (const entry of entries) {
    const fileName = toUtf8(entry.path);
    const fileData = entry.data;
    const uncompressedSize = fileData.byteLength;
    const checksum = crc32(fileData);

    const localHeader = new Uint8Array(30 + fileName.byteLength);

    writeUInt32LE(localHeader, 0, 0x04034b50);
    writeUInt16LE(localHeader, 4, 20);
    writeUInt16LE(localHeader, 6, 0);
    writeUInt16LE(localHeader, 8, 0);
    writeUInt16LE(localHeader, 10, dosTime);
    writeUInt16LE(localHeader, 12, dosDate);
    writeUInt32LE(localHeader, 14, checksum);
    writeUInt32LE(localHeader, 18, uncompressedSize);
    writeUInt32LE(localHeader, 22, uncompressedSize);
    writeUInt16LE(localHeader, 26, fileName.byteLength);
    writeUInt16LE(localHeader, 28, 0);
    localHeader.set(fileName, 30);

    localAndDataParts.push(localHeader, fileData);

    const centralHeader = new Uint8Array(46 + fileName.byteLength);

    writeUInt32LE(centralHeader, 0, 0x02014b50);
    writeUInt16LE(centralHeader, 4, 20);
    writeUInt16LE(centralHeader, 6, 20);
    writeUInt16LE(centralHeader, 8, 0);
    writeUInt16LE(centralHeader, 10, 0);
    writeUInt16LE(centralHeader, 12, dosTime);
    writeUInt16LE(centralHeader, 14, dosDate);
    writeUInt32LE(centralHeader, 16, checksum);
    writeUInt32LE(centralHeader, 20, uncompressedSize);
    writeUInt32LE(centralHeader, 24, uncompressedSize);
    writeUInt16LE(centralHeader, 28, fileName.byteLength);
    writeUInt16LE(centralHeader, 30, 0);
    writeUInt16LE(centralHeader, 32, 0);
    writeUInt16LE(centralHeader, 34, 0);
    writeUInt16LE(centralHeader, 36, 0);
    writeUInt32LE(centralHeader, 38, 0);
    writeUInt32LE(centralHeader, 42, offset);
    centralHeader.set(fileName, 46);

    centralDirectoryParts.push(centralHeader);
    offset += localHeader.byteLength + fileData.byteLength;
  }

  const centralDirectory = concatBytes(centralDirectoryParts);
  const endOfCentralDirectory = new Uint8Array(22);

  writeUInt32LE(endOfCentralDirectory, 0, 0x06054b50);
  writeUInt16LE(endOfCentralDirectory, 4, 0);
  writeUInt16LE(endOfCentralDirectory, 6, 0);
  writeUInt16LE(endOfCentralDirectory, 8, entries.length);
  writeUInt16LE(endOfCentralDirectory, 10, entries.length);
  writeUInt32LE(endOfCentralDirectory, 12, centralDirectory.byteLength);
  writeUInt32LE(endOfCentralDirectory, 16, offset);
  writeUInt16LE(endOfCentralDirectory, 20, 0);

  return concatBytes([...localAndDataParts, centralDirectory, endOfCentralDirectory]);
}

function columnLabelToIndex(columnLabel: string): number {
  let index = 0;

  for (const char of columnLabel) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }

  return index;
}

function columnIndexToLabel(index: number): string {
  let current = index;
  let label = '';

  while (current > 0) {
    const remainder = (current - 1) % 26;

    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }

  return label;
}

function parseAddress(address: string): { row: number; column: number } {
  const parsed = A1_ADDRESS_REGEX.exec(address);

  if (!parsed) {
    throw new Error(`Invalid cell address: ${address}`);
  }

  return {
    column: columnLabelToIndex(parsed[1]),
    row: Number(parsed[2]),
  };
}

function toPositionedCell(address: string, cell: CellModel): PositionedCell {
  const parsedAddress = parseAddress(address);

  return {
    address,
    row: parsedAddress.row,
    column: parsedAddress.column,
    cell,
  };
}

function renderValueCell(address: string, value: string | number | boolean | null): string {
  if (value === null) {
    return `<c r="${address}"/>`;
  }

  if (typeof value === 'string') {
    return `<c r="${address}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return `<c r="${address}"><v>${value}</v></c>`;
    }

    return `<c r="${address}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
  }

  return `<c r="${address}" t="b"><v>${value ? 1 : 0}</v></c>`;
}

function renderCell(positionedCell: PositionedCell): string {
  if (positionedCell.cell.kind === 'value') {
    return renderValueCell(positionedCell.address, positionedCell.cell.value);
  }

  return `<c r="${positionedCell.address}"><f>${escapeXml(positionedCell.cell.formula)}</f></c>`;
}

function buildSheetDimension(cells: PositionedCell[]): string {
  if (cells.length === 0) {
    return 'A1';
  }

  const minRow = Math.min(...cells.map((cell) => cell.row));
  const maxRow = Math.max(...cells.map((cell) => cell.row));
  const minColumn = Math.min(...cells.map((cell) => cell.column));
  const maxColumn = Math.max(...cells.map((cell) => cell.column));
  const minAddress = `${columnIndexToLabel(minColumn)}${minRow}`;
  const maxAddress = `${columnIndexToLabel(maxColumn)}${maxRow}`;

  if (minAddress === maxAddress) {
    return minAddress;
  }

  return `${minAddress}:${maxAddress}`;
}

function createSheetXml(sheet: SheetModel): string {
  const cells = Object.entries(sheet.cells)
    .map(([address, cell]) => toPositionedCell(address, cell))
    .sort((left, right) => {
      if (left.row !== right.row) {
        return left.row - right.row;
      }

      return left.column - right.column;
    });
  const rows = new Map<number, PositionedCell[]>();

  for (const cell of cells) {
    const rowCells = rows.get(cell.row) ?? [];

    rowCells.push(cell);
    rows.set(cell.row, rowCells);
  }

  const rowsXml = Array.from(rows.entries())
    .sort(([leftRow], [rightRow]) => leftRow - rightRow)
    .map(([row, rowCells]) => `<row r="${row}">${rowCells.map(renderCell).join('')}</row>`)
    .join('');
  const dimension = buildSheetDimension(cells);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetViews>
    <sheetView workbookViewId="0"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;
}

function quoteSheetNameForRange(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function createWorkbookXml(model: WorkbookModel): string {
  const sheetsXml = model.sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join('');
  const definedNamesXml =
    model.namedRanges.length > 0
      ? `<definedNames>${model.namedRanges
          .map(
            (namedRange) =>
              `<definedName name="${escapeXml(namedRange.name)}">${escapeXml(`${quoteSheetNameForRange(namedRange.sheetName)}!${namedRange.range}`)}</definedName>`,
          )
          .join('')}</definedNames>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/>
  </bookViews>
  <sheets>${sheetsXml}</sheets>
  ${definedNamesXml}
  <calcPr calcId="171027"/>
</workbook>`;
}

function createWorkbookRelationshipsXml(sheetCount: number): string {
  const sheetRelations = Array.from({ length: sheetCount }, (_, index) => {
    const relationId = index + 1;

    return `<Relationship Id="rId${relationId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${relationId}.xml"/>`;
  }).join('');
  const stylesRelation = `<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRelations}
  ${stylesRelation}
</Relationships>`;
}

function createContentTypesXml(sheetCount: number): string {
  const sheetOverrides = Array.from({ length: sheetCount }, (_, index) => {
    const sheetNumber = index + 1;

    return `<Override PartName="/xl/worksheets/sheet${sheetNumber}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${sheetOverrides}
</Types>`;
}

function createRootRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function createStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1">
    <font>
      <sz val="11"/>
      <color theme="1"/>
      <name val="Calibri"/>
      <family val="2"/>
      <scheme val="minor"/>
    </font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

function createCorePropertiesXml(model: WorkbookModel, now: Date): string {
  const timestamp = toIsoTimestamp(now);
  const title = model.metadata?.title ?? 'Mock Workbook';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>MockXlsxBinaryWriter</dc:creator>
  <cp:lastModifiedBy>MockXlsxBinaryWriter</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>
</cp:coreProperties>`;
}

function createAppPropertiesXml(model: WorkbookModel): string {
  const titles = model.sheets
    .map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>MockXlsxBinaryWriter</Application>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${model.sheets.length}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${model.sheets.length}" baseType="lpstr">${titles}</vt:vector>
  </TitlesOfParts>
</Properties>`;
}

function buildWorkbookArchive(model: WorkbookModel): Uint8Array {
  const now = new Date();
  const entries: ZipEntry[] = [
    {
      path: '[Content_Types].xml',
      data: toUtf8(createContentTypesXml(model.sheets.length)),
    },
    {
      path: '_rels/.rels',
      data: toUtf8(createRootRelationshipsXml()),
    },
    {
      path: 'docProps/core.xml',
      data: toUtf8(createCorePropertiesXml(model, now)),
    },
    {
      path: 'docProps/app.xml',
      data: toUtf8(createAppPropertiesXml(model)),
    },
    {
      path: 'xl/workbook.xml',
      data: toUtf8(createWorkbookXml(model)),
    },
    {
      path: 'xl/_rels/workbook.xml.rels',
      data: toUtf8(createWorkbookRelationshipsXml(model.sheets.length)),
    },
    {
      path: 'xl/styles.xml',
      data: toUtf8(createStylesXml()),
    },
    ...model.sheets.map((sheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      data: toUtf8(createSheetXml(sheet)),
    })),
  ];

  return zipStore(entries, now);
}

export class MockXlsxBinaryWriter implements XlsxBinaryWriter {
  write(model: WorkbookModel): Uint8Array {
    return buildWorkbookArchive(model);
  }
}

export const mockXlsxWriter: XlsxBinaryWriter = new MockXlsxBinaryWriter();
