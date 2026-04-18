import type { MockUser } from '@report-platform/auth';
import type { ApiError } from '@report-platform/contracts';
import type { ReportRegistry } from '@report-platform/registry';
import type { BuiltFile } from '@report-platform/xlsx';

import { isBuiltFile } from './report-http.helpers';

export type ReportLaunchProgressEvent = {
  stage: 'preparing' | 'generating';
  progressPercent: number;
};

export type ExecuteReportLaunchInWorkerArgs = {
  reportCode: string;
  currentUser: MockUser;
  params: unknown;
  registry: ReportRegistry;
  onProgress: (event: ReportLaunchProgressEvent) => void;
};

export async function executeReportLaunchInWorker(
  args: ExecuteReportLaunchInWorkerArgs,
): Promise<BuiltFile> {
  const reportDefinition = args.registry.getReport(args.reportCode);

  args.onProgress({
    stage: 'preparing',
    progressPercent: 10,
  });

  if (!reportDefinition) {
    throw {
      code: 'NOT_FOUND',
      message: `Unknown report: ${args.reportCode}`,
    } satisfies ApiError;
  }

  args.onProgress({
    stage: 'generating',
    progressPercent: 30,
  });

  const reportResult = await reportDefinition.launch(args.currentUser, args.params, {
    onProgress(progressPercent) {
      args.onProgress({
        stage: 'generating',
        progressPercent,
      });
    },
  });

  if (!isBuiltFile(reportResult)) {
    throw new Error('Current async prototype supports only file-based report results');
  }

  return reportResult;
}
