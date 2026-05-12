import { Controller, Get, HttpCode, Inject, Param } from '@nestjs/common';

import { toHttpException } from './report-http.helpers';
import { ReportRunsQueryService } from './modules/report-runs/services/report-runs-query.service';

@Controller()
export class ReportRunsController {
  constructor(
    @Inject(ReportRunsQueryService)
    private readonly reportRunsQueryService: ReportRunsQueryService,
  ) {}

  @Get('report-runs/:reportInstanceId')
  @HttpCode(200)
  async getReportInstance(@Param('reportInstanceId') reportInstanceId: string) {
    try {
      return await this.reportRunsQueryService.getReportInstance(reportInstanceId);
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
