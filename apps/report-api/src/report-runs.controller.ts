import { Controller, Get, HttpCode, Inject, Param } from '@nestjs/common';

import { ReportInstanceIdParamSchema } from './common/pipes/request-schemas';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { ReportRunsQueryService } from './modules/report-runs/services/report-runs-query.service';

@Controller()
export class ReportRunsController {
  constructor(
    @Inject(ReportRunsQueryService)
    private readonly reportRunsQueryService: ReportRunsQueryService,
  ) {}

  @Get('report-runs/:reportInstanceId')
  @HttpCode(200)
  getReportInstance(
    @Param(
      'reportInstanceId',
      new ZodValidationPipe(ReportInstanceIdParamSchema, 'Invalid report instance id.'),
    )
    reportInstanceId: string,
  ) {
    return this.reportRunsQueryService.getReportInstance(reportInstanceId);
  }
}
