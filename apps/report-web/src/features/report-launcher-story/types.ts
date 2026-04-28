import type { Role } from '@report-platform/contracts';

export type UnavailableReportReason =
  | 'insufficient_role'
  | 'tenant_scope_required'
  | 'organization_scope_required';

export type ConstraintSeverity = 'info' | 'warning' | 'critical';
export type RunStatus = 'queued' | 'running' | 'failed' | 'completed';
export type RunStageStatus = 'pending' | 'active' | 'completed' | 'failed';
export type ArtifactAvailability = 'available' | 'unavailable';

export type LauncherUser = {
  id: string;
  name: string;
  role: Role;
  tenantScope: string[];
  organizationScope: string[];
};

export type ReportSelectionItem = {
  code: string;
  name: string;
  description: string;
  availability: 'available' | 'unavailable';
  unavailableReason?: UnavailableReportReason;
  minRoleToLaunch: Role;
};

export type LaunchConstraint = {
  id: string;
  label: string;
  details: string;
  severity: ConstraintSeverity;
};

export type LaunchConfigurationModel<TLaunchParams = unknown> = {
  reportCode: string;
  reportTitle: string;
  reportDescription: string;
  contextSummary: string;
  constraints: LaunchConstraint[];
  canLaunch: boolean;
  disabledReason?: string;
  initialValues: TLaunchParams;
};

export type ProgressStageItem = {
  id: string;
  label: string;
  status: RunStageStatus;
};

export type DiagnosticItem = {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
};

export type RunProgressSnapshot = {
  status: RunStatus;
  stageLabel: string;
  progress: number;
  stages: ProgressStageItem[];
  diagnostics: DiagnosticItem[];
  failureMessage?: string;
};

export type ResultArtifact = {
  id: string;
  fileName: string;
  sizeLabel: string;
  createdAt: string;
  downloadUrl?: string;
  availability: ArtifactAvailability;
};

export type ReadyReportInstanceItem = {
  id: string;
  label: string;
  downloadHref?: string;
  createdAtLabel: string;
  finishedAtLabel: string;
  sizeLabel: string;
};

export type ReadyReportInstancesSummary = {
  count: number;
  canOpenLinks: boolean;
  isLoading?: boolean;
  items: ReadyReportInstanceItem[];
};

export type LaunchSummaryLine = {
  id: string;
  label: string;
  value: string;
};

export type Step4ResultModel = {
  summary: string;
  primaryArtifact?: ResultArtifact | null;
  recentArtifacts: ResultArtifact[];
  launchSummary?: LaunchSummaryLine[];
};

export type StepperDemoScenario = {
  id: string;
  name: string;
  description: string;
  initialStep?: number;
  initialUserId: string;
  initialSelectedReportCode: string;
  users: LauncherUser[];
  reports: ReportSelectionItem[];
  launchConfiguration: LaunchConfigurationModel;
  progressTimeline: RunProgressSnapshot[];
  result: Step4ResultModel;
};
