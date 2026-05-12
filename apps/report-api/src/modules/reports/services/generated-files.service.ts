import { Inject, Injectable } from '@nestjs/common';

import type { ApiError } from '@report-platform/contracts';

import { FileSystemReportInstanceStore } from '../../../report-instance.store';
import { REPORT_INSTANCE_STORE_TOKEN } from '../../../reporting.tokens';

@Injectable()
export class GeneratedFilesService {
  constructor(
    @Inject(REPORT_INSTANCE_STORE_TOKEN)
    private readonly reportInstanceStore: FileSystemReportInstanceStore,
  ) {}

  async getGeneratedFile(fileId: string) {
    const storedFile = await this.reportInstanceStore.getArtifact(fileId);

    if (!storedFile) {
      throw {
        code: 'NOT_FOUND',
        message: 'Generated file not found.',
      } satisfies ApiError;
    }

    return {
      fileName: storedFile.fileName,
      mimeType: storedFile.mimeType,
      byteLength: storedFile.bytes.byteLength,
      bytes: Buffer.from(storedFile.bytes),
    };
  }
}
