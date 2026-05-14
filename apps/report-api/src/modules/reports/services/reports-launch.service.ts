import { Inject, Injectable } from '@nestjs/common';

import { type ApiError, type CurrentUser, type LaunchReportBody } from '@report-platform/contracts';
import { ReportRegistry } from '@report-platform/registry';

import { hasRoleAccess } from '../../../report-http.helpers';
import { ReportInstanceRunner } from '../../../report-instance.runner';
import { REPORT_INSTANCE_RUNNER_TOKEN, REPORT_REGISTRY_TOKEN } from '../../../reporting.tokens';

@Injectable()
export class ReportsLaunchService {
  constructor(
    @Inject(REPORT_REGISTRY_TOKEN)
    private readonly reportRegistry: ReportRegistry,
    @Inject(REPORT_INSTANCE_RUNNER_TOKEN)
    private readonly reportInstanceRunner: ReportInstanceRunner,
  ) {}

  async launchReport(reportCode: string, body: LaunchReportBody, currentUser: CurrentUser) {
    const reportDefinition = this.reportRegistry.getReport(reportCode);

    if (!reportDefinition) {
      throw {
        code: 'NOT_FOUND',
        message: `Unknown report: ${reportCode}`,
      } satisfies ApiError;
    }

    const reportMetadata = reportDefinition.getMetadata(currentUser);

    if (!hasRoleAccess(currentUser.role, reportMetadata.minRoleToLaunch)) {
      throw {
        code: 'FORBIDDEN',
        message: 'You do not have access to launch this report.',
      } satisfies ApiError;
    }

    const parsedLaunchParams = reportDefinition.launchParamsSchema.safeParse(body.params);

    if (!parsedLaunchParams.success) {
      throw {
        code: 'VALIDATION_ERROR',
        message: 'Invalid launch params for selected report.',
      } satisfies ApiError;
    }

    return this.reportInstanceRunner.start({
      reportCode,
      currentUser,
      params: parsedLaunchParams.data,
    });
  }
}
