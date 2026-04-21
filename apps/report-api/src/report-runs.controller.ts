import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
} from '@nestjs/common';

import {
  ReportInstanceSchema,
  type ApiError,
} from '@report-platform/contracts';

import {
  REPORT_INSTANCE_STORE_TOKEN,
} from './reporting.providers';
import { toHttpException } from './report-http.helpers';
import { FileSystemReportInstanceStore } from './report-instance.store';

@Controller()
export class ReportRunsController {
  constructor(
    @Inject(REPORT_INSTANCE_STORE_TOKEN)
    private readonly reportInstanceStore: FileSystemReportInstanceStore,
  ) {}

  @Get('report-runs/:reportInstanceId')
  @HttpCode(200)
  async getReportInstance(@Param('reportInstanceId') reportInstanceId: string) {
    try {
      const normalizedReportInstanceId = reportInstanceId.trim();
      const reportInstance = await this.reportInstanceStore.get(
        normalizedReportInstanceId,
      );

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
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
