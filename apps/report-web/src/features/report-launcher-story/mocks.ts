import type {
  LaunchConfigurationModel,
  LauncherUser,
  ReportSelectionItem,
  ResultArtifact,
  RunProgressSnapshot,
  Step4ResultModel,
  StepperDemoScenario,
} from './types';
import type { SimpleSalesSummaryLaunchParams } from '@report-platform/contracts';
import { SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS } from '@report-platform/contracts';

export const mockLauncherUsers: LauncherUser[] = [
  {
    id: 'admin-maria',
    name: 'Maria Ivanova',
    role: 'Admin',
    tenantScope: ['tenant-alpha', 'tenant-beta', 'tenant-gamma'],
    organizationScope: ['org-north', 'org-west'],
  },
  {
    id: 'tenant-admin-oleg',
    name: 'Oleg Sidorov',
    role: 'TenantAdmin',
    tenantScope: ['tenant-alpha'],
    organizationScope: [],
  },
  {
    id: 'member-anna',
    name: 'Anna Petrova',
    role: 'Member',
    tenantScope: ['tenant-alpha'],
    organizationScope: [],
  },
  {
    id: 'auditor-nina',
    name: 'Nina Smirnova',
    role: 'Auditor',
    tenantScope: ['tenant-audit'],
    organizationScope: ['org-audit'],
  },
];

export const mockReportSelectionItems: ReportSelectionItem[] = [
  {
    code: 'simple-sales-summary',
    name: 'Simple Sales Summary',
    description: 'Tenant-level monthly sales summary with KPI blocks and trends.',
    availability: 'available',
    minRoleToLaunch: 'Member',
  },
  {
    code: 'weather-anomaly-export',
    name: 'Weather Anomaly Export',
    description: 'Cross-join sales with weather signals, requires external dependency.',
    availability: 'available',
    minRoleToLaunch: 'TenantAdmin',
  },
  {
    code: 'org-risk-audit',
    name: 'Organization Risk Audit',
    description: 'Org-wide compliance package with business-unit comparison.',
    availability: 'unavailable',
    unavailableReason: 'organization_scope_required',
    minRoleToLaunch: 'Admin',
  },
  {
    code: 'tenant-reconciliation',
    name: 'Tenant Reconciliation',
    description: 'Requires multiple tenant scope to reconcile cross-tenant balances.',
    availability: 'unavailable',
    unavailableReason: 'tenant_scope_required',
    minRoleToLaunch: 'TenantAdmin',
  },
  {
    code: 'security-posture-overview',
    name: 'Security Posture Overview',
    description: 'Requires elevated role because it exposes policy-level diagnostics.',
    availability: 'unavailable',
    unavailableReason: 'insufficient_role',
    minRoleToLaunch: 'Admin',
  },
];

export const defaultLaunchConfiguration: LaunchConfigurationModel<SimpleSalesSummaryLaunchParams> =
  {
    reportCode: 'simple-sales-summary',
    reportTitle: 'Simple Sales Summary',
    reportDescription: 'Builds XLSX report that enriches tenant sales with OpenWeather metrics.',
    contextSummary: 'Execution context: tenant mode (tenant-alpha), initiator role TenantAdmin.',
    constraints: [
      {
        id: 'c-1',
        label: 'Role gate',
        details: 'Minimum role: TenantAdmin',
        severity: 'info',
      },
      {
        id: 'c-2',
        label: 'Scope gate',
        details: 'Requires tenant scope, organization scope is optional.',
        severity: 'warning',
      },
      {
        id: 'c-3',
        label: 'Dependency',
        details: 'Requires OpenWeather credentials at launch time.',
        severity: 'critical',
      },
    ],
    canLaunch: true,
    initialValues: {
      tenantId: 'tenant-alpha',
      organizationId: 'org-north',
      credentials: {
        mode: 'manual',
        apiKey: '',
      },
    },
  };

export const step2StoryStates = {
  readyToLaunch: {
    ...defaultLaunchConfiguration,
  },
  noExternalDependency: {
    ...defaultLaunchConfiguration,
    reportCode: 'simple-sales-summary-xlsx',
    reportTitle: 'Pelmeni Product × Channel Matrix XLSX',
    constraints: defaultLaunchConfiguration.constraints.filter(
      (constraint) => constraint.id !== 'c-3',
    ),
    initialValues: {
      name: 'Pavel',
      job: 'Engineer',
      email: 'pavel@example.com',
      favoriteColor: '#abc',
      age: 30,
      website: 'https://example.com',
      role: 'developer',
      datasetKey: SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS[0],
    },
  },
  forbiddenLaunch: {
    ...defaultLaunchConfiguration,
    canLaunch: false,
    disabledReason:
      'Недостаточно прав: для выбранного отчета нужен organization scope и роль Admin.',
  },
  metadataLoading: {
    ...defaultLaunchConfiguration,
    canLaunch: false,
    disabledReason: 'Loading report metadata...',
  },
};

const baseStages = [
  { id: 'stage-queued', label: 'Queued', status: 'pending' as const },
  { id: 'stage-extract', label: 'Data extraction', status: 'pending' as const },
  { id: 'stage-build', label: 'Workbook build', status: 'pending' as const },
  { id: 'stage-store', label: 'Artifact publish', status: 'pending' as const },
];

export const step3StoryStates: Record<string, RunProgressSnapshot> = {
  queued: {
    status: 'queued',
    stageLabel: 'Waiting for worker slot',
    progress: 0,
    stages: [{ ...baseStages[0], status: 'active' }, ...baseStages.slice(1)],
    diagnostics: [{ id: 'diag-q1', level: 'info', message: 'Job accepted by launcher service.' }],
  },
  running20: {
    status: 'running',
    stageLabel: 'Extracting source rows',
    progress: 20,
    stages: [
      { ...baseStages[0], status: 'completed' },
      { ...baseStages[1], status: 'active' },
      ...baseStages.slice(2),
    ],
    diagnostics: [
      { id: 'diag-r1', level: 'info', message: 'Tenant filter resolved to tenant-alpha.' },
      { id: 'diag-r2', level: 'warning', message: 'Rate-limited weather API, retrying.' },
    ],
  },
  running80: {
    status: 'running',
    stageLabel: 'Writing workbook sheets',
    progress: 80,
    stages: [
      { ...baseStages[0], status: 'completed' },
      { ...baseStages[1], status: 'completed' },
      { ...baseStages[2], status: 'active' },
      { ...baseStages[3], status: 'pending' },
    ],
    diagnostics: [
      { id: 'diag-r3', level: 'info', message: 'Rows prepared: 48,512.' },
      { id: 'diag-r4', level: 'info', message: 'Workbook template hydrated.' },
    ],
  },
  failed: {
    status: 'failed',
    stageLabel: 'Credential handshake failed',
    progress: 65,
    stages: [
      { ...baseStages[0], status: 'completed' },
      { ...baseStages[1], status: 'completed' },
      { ...baseStages[2], status: 'failed' },
      { ...baseStages[3], status: 'pending' },
    ],
    diagnostics: [{ id: 'diag-f1', level: 'error', message: 'OpenWeather key rejected (401).' }],
    failureMessage: 'Launch failed: external dependency credentials are invalid.',
  },
  completed: {
    status: 'completed',
    stageLabel: 'Artifact ready',
    progress: 100,
    stages: baseStages.map((stage) => ({ ...stage, status: 'completed' })),
    diagnostics: [
      { id: 'diag-c1', level: 'info', message: 'Artifact uploaded to file-store.' },
      { id: 'diag-c2', level: 'info', message: 'Download link signed for 24h.' },
    ],
  },
};

const primaryArtifact: ResultArtifact = {
  id: 'artifact-001',
  fileName: 'weather-anomaly-export-2026-03.xlsx',
  sizeLabel: '1.4 MB',
  createdAt: '2026-04-19 12:44 UTC',
  availability: 'available',
  downloadUrl: '#download-weather-anomaly-export',
};

export const step4StoryStates: Record<string, Step4ResultModel> = {
  singleResult: {
    summary: 'Report completed successfully. Single output artifact is ready.',
    primaryArtifact,
    launchSummary: [
      { id: 'ls-1', label: 'Report', value: 'Weather Anomaly Export' },
      { id: 'ls-2', label: 'Launched by', value: 'Oleg Sidorov (TenantAdmin)' },
      { id: 'ls-3', label: 'Scope', value: 'tenant-alpha' },
      { id: 'ls-4', label: 'Credential mode', value: 'Shared setting' },
    ],
    recentArtifacts: [],
  },
  withRecentArtifacts: {
    summary: 'Report completed successfully. Recent artifacts are listed below.',
    primaryArtifact,
    launchSummary: [
      { id: 'ls-1', label: 'Report', value: 'Weather Anomaly Export' },
      { id: 'ls-2', label: 'Launched by', value: 'Maria Ivanova (Admin)' },
      { id: 'ls-3', label: 'Scope', value: 'tenant-alpha, tenant-beta' },
      { id: 'ls-4', label: 'Credential mode', value: 'Manual API key' },
    ],
    recentArtifacts: [
      primaryArtifact,
      {
        id: 'artifact-002',
        fileName: 'weather-anomaly-export-2026-02.xlsx',
        sizeLabel: '1.2 MB',
        createdAt: '2026-03-21 08:05 UTC',
        availability: 'available',
        downloadUrl: '#download-weather-anomaly-feb',
      },
      {
        id: 'artifact-003',
        fileName: 'weather-anomaly-export-2026-01.xlsx',
        sizeLabel: '1.1 MB',
        createdAt: '2026-02-19 09:12 UTC',
        availability: 'available',
        downloadUrl: '#download-weather-anomaly-jan',
      },
    ],
  },
  noHistory: {
    summary: 'Report completed, but there is no previous artifact history yet.',
    primaryArtifact,
    launchSummary: [
      { id: 'ls-1', label: 'Report', value: 'Simple Sales Summary' },
      { id: 'ls-2', label: 'Launched by', value: 'Anna Petrova (Member)' },
      { id: 'ls-3', label: 'Scope', value: 'tenant-alpha' },
      { id: 'ls-4', label: 'Credential mode', value: 'Not required' },
    ],
    recentArtifacts: [],
  },
  brokenLink: {
    summary: 'Report was generated, but file link is currently unavailable.',
    primaryArtifact: {
      ...primaryArtifact,
      availability: 'unavailable',
      downloadUrl: undefined,
    },
    launchSummary: [
      { id: 'ls-1', label: 'Report', value: 'Weather Anomaly Export' },
      { id: 'ls-2', label: 'Launched by', value: 'Nina Smirnova (Auditor)' },
      { id: 'ls-3', label: 'Scope', value: 'tenant-audit / org-audit' },
      { id: 'ls-4', label: 'Credential mode', value: 'Shared setting' },
    ],
    recentArtifacts: [
      {
        id: 'artifact-004',
        fileName: 'weather-anomaly-export-2025-12.xlsx',
        sizeLabel: '900 KB',
        createdAt: '2026-01-03 14:33 UTC',
        availability: 'available',
        downloadUrl: '#download-weather-anomaly-dec',
      },
    ],
  },
};

export const stepperScenarios: Record<string, StepperDemoScenario> = {
  happyPath: {
    id: 'happy-path',
    name: 'Full Happy Path',
    description: 'Selectable report, valid access, and successful completion.',
    initialStep: 0,
    initialUserId: 'tenant-admin-oleg',
    initialSelectedReportCode: 'weather-anomaly-export',
    users: mockLauncherUsers,
    reports: mockReportSelectionItems,
    launchConfiguration: step2StoryStates.readyToLaunch,
    progressTimeline: [
      step3StoryStates.queued,
      step3StoryStates.running20,
      step3StoryStates.running80,
      step3StoryStates.completed,
    ],
    result: step4StoryStates.withRecentArtifacts,
  },
  accessRestricted: {
    id: 'access-restricted-path',
    name: 'Access Restricted Path',
    description: 'User can review the report but launch is blocked by constraints.',
    initialStep: 1,
    initialUserId: 'member-anna',
    initialSelectedReportCode: 'org-risk-audit',
    users: mockLauncherUsers,
    reports: mockReportSelectionItems,
    launchConfiguration: step2StoryStates.forbiddenLaunch,
    progressTimeline: [step3StoryStates.queued, step3StoryStates.failed],
    result: step4StoryStates.singleResult,
  },
  credentialBased: {
    id: 'credential-based-path',
    name: 'Credential Based Path',
    description: 'Launch requires choosing shared setting before progress starts.',
    initialStep: 1,
    initialUserId: 'tenant-admin-oleg',
    initialSelectedReportCode: 'weather-anomaly-export',
    users: mockLauncherUsers,
    reports: mockReportSelectionItems,
    launchConfiguration: step2StoryStates.readyToLaunch,
    progressTimeline: [
      step3StoryStates.queued,
      step3StoryStates.running20,
      step3StoryStates.completed,
    ],
    result: step4StoryStates.singleResult,
  },
  completed: {
    id: 'completed-path',
    name: 'Completed Path',
    description: 'Story opens directly with completed result stage.',
    initialStep: 3,
    initialUserId: 'admin-maria',
    initialSelectedReportCode: 'weather-anomaly-export',
    users: mockLauncherUsers,
    reports: mockReportSelectionItems,
    launchConfiguration: step2StoryStates.readyToLaunch,
    progressTimeline: [step3StoryStates.completed],
    result: step4StoryStates.withRecentArtifacts,
  },
  failed: {
    id: 'failed-path',
    name: 'Failed Path',
    description: 'Run fails on stage three; retry remains mock-only.',
    initialStep: 2,
    initialUserId: 'tenant-admin-oleg',
    initialSelectedReportCode: 'weather-anomaly-export',
    users: mockLauncherUsers,
    reports: mockReportSelectionItems,
    launchConfiguration: step2StoryStates.readyToLaunch,
    progressTimeline: [
      step3StoryStates.queued,
      step3StoryStates.running20,
      step3StoryStates.failed,
    ],
    result: step4StoryStates.brokenLink,
  },
};
