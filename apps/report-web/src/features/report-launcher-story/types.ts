import type { Role } from '@report-platform/contracts';

export type UnavailableReportReason =
  | 'insufficient_role'
  | 'tenant_scope_required'
  | 'organization_scope_required';

export type CredentialsMode = 'manual' | 'shared_setting';
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

export type LaunchParameterField = {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  value?: string;
  helperText?: string;
  disabled?: boolean;
};

export type SharedSettingOption = {
  id: string;
  label: string;
  description: string;
};

export type LaunchConfigurationModel = {
  reportCode: string;
  reportTitle: string;
  reportDescription: string;
  contextSummary: string;
  constraints: LaunchConstraint[];
  parameterFields: LaunchParameterField[];
  credentials: {
    manualLabel: string;
    sharedLabel: string;
    defaultMode: CredentialsMode;
    manualApiKey?: string;
    sharedSettings: SharedSettingOption[];
    selectedSharedSettingId?: string;
    sharedSettingsLoading?: boolean;
    sharedSettingsEmptyReason?: string;
    sharedModeDisabled?: boolean;
  };
  canLaunch: boolean;
  disabledReason?: string;
  forcedValidationMessage?: string;
  externalDependency?: string;
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

export type LaunchSummaryLine = {
  id: string;
  label: string;
  value: string;
};

export type Step4ResultModel = {
  summary: string;
  primaryArtifact: ResultArtifact | null;
  recentArtifacts: ResultArtifact[];
  launchSummary: LaunchSummaryLine[];
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
