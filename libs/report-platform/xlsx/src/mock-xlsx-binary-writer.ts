import type { WorkbookModel } from './model';
import type { XlsxBinaryWriter } from './writer';

type MockBinaryPayload = {
  format: 'mock-xlsx-json-bytes';
  warning: string;
  workbook: WorkbookModel;
};

export class MockXlsxBinaryWriter implements XlsxBinaryWriter {
  write(model: WorkbookModel): Uint8Array {
    const payload: MockBinaryPayload = {
      format: 'mock-xlsx-json-bytes',
      warning:
        'This is a mock payload encoded as JSON bytes. It is not real XLSX binary serialization.',
      workbook: model,
    };

    return new TextEncoder().encode(JSON.stringify(payload, null, 2));
  }
}
