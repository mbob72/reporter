import { Inject, Injectable } from '@nestjs/common';

import { getCurrentUser, MOCK_USER_HEADER } from '@report-platform/auth';
import { LaunchReportBodySchema, type ApiError } from '@report-platform/contracts';
import { ReportRegistry } from '@report-platform/registry';

import { hasRoleAccess } from '../../../report-http.helpers';
import { ReportInstanceRunner } from '../../../report-instance.runner';
import { REPORT_INSTANCE_RUNNER_TOKEN, REPORT_REGISTRY_TOKEN } from '../../../reporting.tokens';

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class ReportsLaunchService {
  constructor(
    @Inject(REPORT_REGISTRY_TOKEN)
    private readonly reportRegistry: ReportRegistry,
    @Inject(REPORT_INSTANCE_RUNNER_TOKEN)
    private readonly reportInstanceRunner: ReportInstanceRunner,
  ) {}

  async launchReport(reportCode: string, body: unknown, request: RequestWithHeaders) {
    const parsedBody = LaunchReportBodySchema.safeParse(body);

    if (!parsedBody.success) {
      throw {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload.',
      } satisfies ApiError;
    }

    const reportDefinition = this.reportRegistry.getReport(reportCode);

    if (!reportDefinition) {
      throw {
        code: 'NOT_FOUND',
        message: `Unknown report: ${reportCode}`,
      } satisfies ApiError;
    }

    const currentUser = getCurrentUser(request.headers);
    const reportMetadata = reportDefinition.getMetadata(currentUser);

    if (!hasRoleAccess(currentUser.role, reportMetadata.minRoleToLaunch)) {
      throw {
        code: 'FORBIDDEN',
        message: 'You do not have access to launch this report.',
      } satisfies ApiError;
    }

    const parsedLaunchParams = reportDefinition.launchParamsSchema.safeParse(
      parsedBody.data.params,
    );

    if (!parsedLaunchParams.success) {
      throw {
        code: 'VALIDATION_ERROR',
        message: 'Invalid launch params for selected report.',
      } satisfies ApiError;
    }

    return {
      launch: await this.reportInstanceRunner.start({
        reportCode,
        currentUser,
        params: parsedLaunchParams.data,
      }),
      mockUser: request.headers[MOCK_USER_HEADER] ?? currentUser.userId,
    };
  }
}
