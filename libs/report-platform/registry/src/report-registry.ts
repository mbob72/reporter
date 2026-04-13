import type {
  CurrentUser,
  ReportCode,
  ReportListItem,
} from '@report-platform/contracts';
import { ReportCodeSchema } from '@report-platform/contracts';

import { buildReportList } from './report-list';

export type ReportDefinition<TResult = unknown> = {
  code: ReportCode;
  title: string;
  description: string;
  launch: (currentUser: CurrentUser, params: unknown) => Promise<TResult>;
};

export class ReportRegistry {
  private readonly reportsByCode = new Map<string, ReportDefinition>();

  constructor(reportDefinitions: ReportDefinition[]) {
    for (const reportDefinition of reportDefinitions) {
      const parsedCode = ReportCodeSchema.safeParse(reportDefinition.code);

      if (!parsedCode.success) {
        throw new Error('Report definition has an invalid code.');
      }

      if (this.reportsByCode.has(parsedCode.data)) {
        throw new Error(`Duplicate report code: ${parsedCode.data}`);
      }

      this.reportsByCode.set(parsedCode.data, reportDefinition);
    }
  }

  listReports(): ReportListItem[] {
    return buildReportList(Array.from(this.reportsByCode.values()));
  }

  getReport(reportCode: string): ReportDefinition | undefined {
    return this.reportsByCode.get(reportCode);
  }
}
