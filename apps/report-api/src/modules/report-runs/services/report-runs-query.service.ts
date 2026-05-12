import { Inject, Injectable } from '@nestjs/common';

import { ReportInstanceSchema, type ApiError } from '@report-platform/contracts';

import { FileSystemReportInstanceStore } from '../../../report-instance.store';
import { REPORT_INSTANCE_STORE_TOKEN } from '../../../reporting.tokens';

@Injectable()
export class ReportRunsQueryService {
  constructor(
    @Inject(REPORT_INSTANCE_STORE_TOKEN)
    private readonly reportInstanceStore: FileSystemReportInstanceStore,
  ) {}

  async getReportInstance(reportInstanceId: string) {
    const normalizedReportInstanceId = reportInstanceId.trim();
    const reportInstance = await this.reportInstanceStore.get(normalizedReportInstanceId);

    if (!reportInstance) {
      throw {
        code: 'NOT_FOUND',
        message: `Unknown report instance: ${normalizedReportInstanceId}`,
      } satisfies ApiError;
    }

    const parsedResponse = ReportInstanceSchema.safeParse(reportInstance);

    if (!parsedResponse.success) {
      throw new Error('Invalid report instance payload.');
    }

    return parsedResponse.data;
  }
}
