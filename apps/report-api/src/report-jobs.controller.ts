import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
} from '@nestjs/common';

import {
  ReportJobStatusResponseSchema,
  type ApiError,
} from '@report-platform/contracts';

import { REPORT_JOB_STORE_TOKEN } from './reporting.providers';
import { toHttpException } from './report-http.helpers';
import { InMemoryReportJobStore } from './report-job.store';

@Controller()
export class ReportJobsController {
  constructor(
    @Inject(REPORT_JOB_STORE_TOKEN)
    private readonly reportJobStore: InMemoryReportJobStore,
  ) {}

  @Get('report-jobs/:jobId')
  @HttpCode(200)
  getReportJobStatus(@Param('jobId') jobId: string) {
    try {
      const normalizedJobId = jobId.trim();
      const jobRecord = this.reportJobStore.get(normalizedJobId);

      if (!jobRecord) {
        throw {
          code: 'NOT_FOUND',
          message: `Unknown report job: ${normalizedJobId}`,
        } satisfies ApiError;
      }

      const parsedResponse = ReportJobStatusResponseSchema.safeParse(jobRecord);

      if (!parsedResponse.success) {
        throw new Error('Invalid report job status payload.');
      }

      return parsedResponse.data;
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
