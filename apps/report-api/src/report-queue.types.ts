import type { MockUser } from '@report-platform/auth';

export type ReportJobPayload = {
  reportInstanceId: string;
  reportCode: string;
  currentUser: MockUser;
  params: Record<string, unknown>;
};
