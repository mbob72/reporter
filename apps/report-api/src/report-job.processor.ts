import { Inject, Injectable } from '@nestjs/common';
import { DownloadableFileResultSchema, type ApiError } from '@report-platform/contracts';
import type { ReportRegistry } from '@report-platform/registry';
import type { Job } from 'bullmq';

import { executeReportLaunchInWorker } from './report-launch.executor';
import { FileSystemReportInstanceStore } from './report-instance.store';
import type { ReportJobPayload } from './report-queue.types';
import { REPORT_INSTANCE_STORE_TOKEN, REPORT_REGISTRY_TOKEN } from './reporting.tokens';

function toErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const candidate = error as Partial<ApiError>;

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unexpected report execution error.';
}

@Injectable()
export class ReportJobProcessor {
  constructor(
    @Inject(REPORT_INSTANCE_STORE_TOKEN)
    private readonly reportInstanceStore: FileSystemReportInstanceStore,
    @Inject(REPORT_REGISTRY_TOKEN)
    private readonly reportRegistry: ReportRegistry,
  ) {}

  async process(job: Job<ReportJobPayload>): Promise<void> {
    const { reportInstanceId, reportCode, currentUser, params } = job.data;

    try {
      await this.reportInstanceStore.markRunning(reportInstanceId);

      const builtFile = await executeReportLaunchInWorker({
        reportCode,
        currentUser,
        params,
        registry: this.reportRegistry,
        onProgress: (event) => {
          void this.reportInstanceStore.updateProgress(
            reportInstanceId,
            event.stage,
            event.progressPercent,
          );
        },
      });

      await this.reportInstanceStore.updateProgress(reportInstanceId, 'storing-result', 90);

      const artifact = await this.reportInstanceStore.saveArtifact({
        reportInstanceId,
        fileName: builtFile.fileName,
        mimeType: builtFile.mimeType,
        bytes: builtFile.bytes,
      });

      const result = DownloadableFileResultSchema.parse({
        kind: 'downloadable-file',
        fileName: builtFile.fileName,
        byteLength: builtFile.bytes.byteLength,
        downloadUrl: `/generated-files/${artifact.artifactId}`,
      });

      await this.reportInstanceStore.markCompleted(reportInstanceId, result, artifact);
    } catch (error) {
      await this.reportInstanceStore.markFailed(reportInstanceId, toErrorMessage(error));
      throw error;
    }
  }
}
