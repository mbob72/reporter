import { mockXlsxWriter } from './mock-xlsx-binary-writer';
import { WorkbookSchema, type WorkbookModel } from './model';

export const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type BuiltFile = {
  fileName: string;
  mimeType: typeof XLSX_MIME_TYPE;
  bytes: Uint8Array;
};

export type XlsxBinaryWriter = {
  write: (model: WorkbookModel) => Uint8Array | Promise<Uint8Array>;
};

const DEFAULT_FILE_NAME = 'report.xlsx';

function getFileName(model: WorkbookModel): string {
  return model.metadata?.fileName ?? DEFAULT_FILE_NAME;
}

export async function makeXlsxFile(
  model: unknown,
  writer: XlsxBinaryWriter = mockXlsxWriter,
): Promise<BuiltFile> {
  const parsedModel = WorkbookSchema.parse(model);
  const bytes = await Promise.resolve(writer.write(parsedModel));

  return {
    fileName: getFileName(parsedModel),
    mimeType: XLSX_MIME_TYPE,
    bytes,
  };
}
