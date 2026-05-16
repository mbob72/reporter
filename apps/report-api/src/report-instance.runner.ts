import * as crypto from 'node:crypto';

import type { MockUser } from '@report-platform/auth';
import { ReportLaunchAcceptedSchema, type ReportLaunchAccepted } from '@report-platform/contracts';
import {
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
  type SimpleSalesSummaryXlsxDatasetRotation,
} from '@report-definitions/simple-sales-summary-xlsx';

import { ReportJobQueue } from './report-job.queue';
import { FileSystemReportInstanceStore } from './report-instance.store';

type StartReportInstanceArgs = {
  reportCode: string;
  currentUser: MockUser;
  params: unknown;
};

function generateReportInstanceId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class ReportInstanceRunner {
  constructor(
    private readonly reportInstanceStore: FileSystemReportInstanceStore,
    private readonly datasetRotation: SimpleSalesSummaryXlsxDatasetRotation,
    private readonly reportJobQueue: ReportJobQueue,
  ) {}

  async start(args: StartReportInstanceArgs): Promise<ReportLaunchAccepted> {
    const reportInstanceId = generateReportInstanceId();

    await this.reportInstanceStore.createQueuedInstance({
      reportInstanceId,
      reportCode: args.reportCode,
    });

    await this.reportJobQueue.enqueue({
      reportInstanceId,
      reportCode: args.reportCode,
      currentUser: args.currentUser,
      params: this.buildInternalParams(args.reportCode, args.params),
    });

    return ReportLaunchAcceptedSchema.parse({
      reportInstanceId,
      status: 'queued',
    });
  }

  private buildInternalParams(reportCode: string, params: unknown): Record<string, unknown> {
    if (!isRecord(params)) {
      if (reportCode !== SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE) {
        return {};
      }

      return {
        datasetKey: this.datasetRotation.nextDatasetKey(),
      };
    }

    if (reportCode !== SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE) {
      return params;
    }

    const datasetKey =
      typeof params.datasetKey === 'string' && params.datasetKey.trim().length > 0
        ? params.datasetKey
        : this.datasetRotation.nextDatasetKey();

    return {
      ...params,
      datasetKey,
    };
  }
}
