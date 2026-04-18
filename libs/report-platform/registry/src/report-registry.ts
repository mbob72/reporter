import type {
  CurrentUser,
  ReportCode,
  ReportListItem,
  ReportMetadata,
} from '@report-platform/contracts';
import { ReportCodeSchema } from '@report-platform/contracts';

import { buildReportList } from './report-list';

export type ReportLaunchOptions = {
  onProgress?: (progressPercent: number) => void;
};

export type ReportDefinition<TResult = unknown> = {
  code: ReportCode;
  title: string;
  description: string;
  getMetadata: (currentUser: CurrentUser) => ReportMetadata;
  launch: (
    currentUser: CurrentUser,
    params: unknown,
    options?: ReportLaunchOptions,
  ) => Promise<TResult>;
};

export class ReportRegistry {
  private readonly reportsByCode = new Map<string, ReportDefinition>();
  private readonly defaultMetadataUser: CurrentUser = {
    userId: 'metadata-system',
    role: 'Admin',
    tenantId: null,
    organizationId: null,
  };

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

  listReportMetadata(currentUser?: CurrentUser): ReportMetadata[] {
    const metadataUser = currentUser ?? this.defaultMetadataUser;

    return Array.from(this.reportsByCode.values()).map((reportDefinition) =>
      reportDefinition.getMetadata(metadataUser),
    );
  }

  getReportMetadata(
    reportCode: string,
    currentUser?: CurrentUser,
  ): ReportMetadata | undefined {
    const reportDefinition = this.getReport(reportCode);

    if (!reportDefinition) {
      return undefined;
    }

    return reportDefinition.getMetadata(currentUser ?? this.defaultMetadataUser);
  }
}
