# Reporting Platform Architecture

## Overview

This repository is an Nx monorepo for report execution with strict access control.

Main goals:

- support multi-tenant data access
- enforce role and tenant boundaries
- keep report business logic separate from infrastructure
- allow independent evolution of platform libraries and report definitions

---

## Core Principles

1. **Reports do not use database credentials.**
Report definitions never receive internal DB credentials and do not open DB connections directly.

2. **Internal data access is scope-driven.**
Reports access internal data only through repositories, and repositories enforce access using the `CurrentUser` scope of the launcher.

3. **External service access is explicit and controlled.**
If a report needs external APIs, credentials are passed at launch time in one of two modes:
- explicit credentials (`manual`: for example API key)
- shared credentials (`shared_setting`: id of credentials stored inside the system)

4. **Report definitions are runtime-controlled entry points.**
Each report is resolved from the registry and executed through `launch(currentUser, params)`.

---

## High-Level Architecture

```txt
apps/
  report-api       -> NestJS API (entry point)
  report-web       -> React UI

libs/
  report-platform/
    contracts      -> shared types and zod schemas
    auth           -> user resolution and access helpers
    data-access    -> repository interfaces and mock implementations
    external-api   -> external auth and API client factory
    xlsx           -> template runtime and BuiltFile model
    file-store     -> generated file persistence and download ids
    registry       -> report definition registry
    api-client     -> frontend client for report API

  report-definitions/
    <report-name>  -> report implementations
```

---

## Execution Context

Current implementation passes `CurrentUser` into each report launch:

```ts
type CurrentUser = {
  userId: string;
  role: 'Auditor' | 'Member' | 'TenantAdmin' | 'Admin';
  tenantId: string | null;
  organizationId: string | null;
};
```

The platform derives access from this scope.

Important:

- no internal DB credentials are passed to reports
- repositories decide what data is accessible for this user

---

## Execution Flow

1. User selects report in UI.
2. UI requests report metadata (`GET /reports/:code/metadata`) to render launch form and constraints.
3. If report metadata declares external dependencies, UI may load shared credential options (`GET /reports/:reportCode/external-services/:serviceKey/shared-settings`).
4. UI launches report (`POST /reports/:reportCode/launch`).
5. API resolves `CurrentUser`, validates input, checks role access via report metadata, and executes report from registry.
6. If report returns `BuiltFile`, API stores bytes in file store and returns a downloadable descriptor.
7. UI downloads generated files through `GET /generated-files/:fileId`.

Current `report-web` implementation uses all of the above steps for active reports.

---

## Report Definition Model

```ts
type ReportDefinition<TResult = unknown> = {
  code: ReportCode;
  title: string;
  description: string;
  getMetadata: (currentUser: CurrentUser) => ReportMetadata;
  launch: (currentUser: CurrentUser, params: unknown) => Promise<TResult>;
};
```

`launch` is the report entry point.

`getMetadata` drives:

- minimal role to launch
- input fields for UI
- declared external dependencies

---

## Report Metadata Model

```ts
type ReportMetadata = {
  code: string;
  title: string;
  description: string;
  minRoleToLaunch: Role;
  fields: ReportFieldMetadata[];
  externalDependencies: ReportExternalDependency[];
};
```

External dependency declaration example:

```ts
{
  serviceKey: 'openWeather',
  authMode: 'api_key',
  minRoleToUse: 'TenantAdmin'
}
```

---

## Credential Model

### Internal Data (our DB / internal sources)

- Report definitions do not receive DB credentials.
- Reports use `data-access` repositories.
- Repositories enforce role and tenant scope from `CurrentUser`.

### External Services

Credentials are provided per launch, inside report params, only when needed:

```ts
type OpenWeatherCredentialInput =
  | { mode: 'manual'; apiKey: string }
  | { mode: 'shared_setting'; sharedSettingId: string };
```

Flow:

- report declares external dependency in metadata
- UI requests available shared credentials (optional)
- on launch, user provides `manual` credentials or `shared_setting` reference
- `ExternalClientFactory` resolves credentials and builds typed API client

---

## External Dependency Resilience

External dependency calls should be resilient and business-explicit.
For an implementation-focused guide, see `docs/external-dependency-resilience.md`.

### Criticality

Each dependency usage is chosen in report/service code as one of:

- `critical`: report fails when dependency still fails after retries
- `optional`: report may continue with explicit fallback value

Criticality is a business decision made by report/service code, not by the low-level HTTP client.

### Retry Strategies

Retry strategy is selected explicitly by report/service code (for example `none`, `transientTwice`, `transientFiveWithBackoff`).

The platform resilience helper executes operations with:

- retry loop
- retryability classification
- retry delays based on selected strategy

### Retryable vs Non-Retryable Failures

Retryable failures include transient issues:

- network failure
- timeout
- HTTP `429`
- HTTP `5xx`

Non-retryable failures include permanent/request issues:

- HTTP `400`
- HTTP `401`
- HTTP `403`
- HTTP `404`
- invalid local input before request execution

### Optional Dependency Fallbacks

For optional dependencies:

- retries may still run if the failure is retryable
- when retries are exhausted (or failure is non-retryable), report/service chooses an explicit fallback
- fallback must be visible in report result when appropriate (not silently swallowed)

Current example:

- `simple-sales-summary` treats weather as optional
- strategy: `transientTwice` (max 3 attempts total)
- fallback value written to report: `!error!`

### Critical Dependency Behavior

For critical dependencies:

- retries may run according to the selected strategy
- if dependency still fails, execution throws and report launch fails
- no silent fallback should be inserted

---

## Registry

`ReportRegistry` is the single source of executable reports.

```ts
class ReportRegistry {
  listReports(): ReportListItem[];
  getReport(reportCode: string): ReportDefinition | undefined;
  listReportMetadata(currentUser?: CurrentUser): ReportMetadata[];
  getReportMetadata(reportCode: string, currentUser?: CurrentUser): ReportMetadata | undefined;
}
```

Current API wiring registers:

- `simple-sales-summary`
- `simple-sales-summary-xlsx`

---

## API Surface

### Reports

- `GET /reports`
- `GET /reports/:code/metadata`
- `POST /reports/:reportCode/launch`

### External Service Support

- `GET /reports/:reportCode/external-services/:serviceKey/shared-settings`

### Scope Support for Inputs

- `GET /tenants`
- `GET /tenants/:tenantId/organizations`

### Generated Files

- `GET /generated-files/:fileId`

Launch request shape:

```json
{
  "params": {}
}
```

For reports with external API auth:

```json
{
  "params": {
    "credentials": {
      "mode": "shared_setting",
      "sharedSettingId": "tenant-1-weather-default"
    }
  }
}
```

or

```json
{
  "params": {
    "credentials": {
      "mode": "manual",
      "apiKey": "replace-with-openweather-api-key"
    }
  }
}
```

The external-credentials examples describe supported payloads for dependency-enabled reports.
They are used by `simple-sales-summary`.

---

## API Client (`report-platform/api-client`)

Current exported operations:

- `listReports`
- `getReportMetadata`
- `launchReport`
- `listTenants`
- `listOrganizations`
- `listSharedSettings`

Current `report-web` app path uses:

- `listReports`
- `getReportMetadata`
- `launchReport`
- `listSharedSettings` (for dependency credential selection in step 2)

Client responsibilities:

- validate inputs for launch and report code
- parse API errors (`ApiErrorSchema`)
- validate typed payloads where applicable

---

## Data Access Layer (`report-platform/data-access`)

Contains repository interfaces and implementations (currently mock).

Responsibilities:

- enforce tenant and role restrictions
- expose only controlled query operations
- prevent report definitions from direct DB access

Critical rule:

- report definitions must not import DB drivers or query builders directly

---

## External API Layer (`report-platform/external-api`)

Contains:

- shared settings provider
- external auth provider
- typed external clients
- `ExternalClientFactory`

Responsibilities:

- resolve shared credentials securely
- authenticate against external services
- provide typed clients to reports
- block undeclared external dependency usage

---

## XLSX Report Concept

`simple-sales-summary-xlsx` follows a template-driven model.

Concept:

- report result is built from source data and a fixed XLSX template
- the template is a stable part of the report data model
- formulas inside the template produce derived values after recalculation

Execution pattern:

1. Collect source rows from repositories (`products`, `channels`).
2. Fill template sheets with fresh data.
3. Recalculate workbook formulas (LibreOffice in headless mode).
4. Read calculated derivative data if needed.
5. Return `BuiltFile` bytes.

API behavior for file reports:

- controller stores `BuiltFile` in generated file store
- response becomes `DownloadableFileResult`

---

## Dependency Rules

### Allowed

```txt
report-definitions -> contracts
report-definitions -> data-access
report-definitions -> registry (type-level report contract)
report-definitions -> xlsx (for file/template reports)
report-definitions -> external-api (only through controlled factory/clients)
report-api -> platform libs + report-definitions
report-web -> api-client + contracts (+ specific report contracts where needed)
```

### Forbidden

```txt
report-definitions -> direct DB clients/drivers
report-definitions -> unmanaged raw external integrations
report-definitions -> internal DB credential handling
```

---

## Security Model

Security is enforced in layers:

1. Identity resolution (`CurrentUser` from request context; currently mock header-based).
2. Launch authorization (`minRoleToLaunch` from metadata).
3. Tenant/organization scoping (auth helpers + repository checks).
4. External dependency declaration and credential resolution control.
5. File output isolation via generated file store IDs.

Goal:

Even if a report has logic bugs, it should still be constrained by platform-level access checks and controlled integrations.

---

## Testing Strategy

Reports should be testable with mocked dependencies:

- mocked repositories for internal data
- mocked external providers/clients for integrations
- deterministic `CurrentUser` fixtures
- template-runtime tests for XLSX generation and formula recalculation paths

---

## Summary

This architecture keeps report code focused on business logic while the platform controls:

- access scope for internal data
- credential flow for external services
- metadata-driven launch constraints
- typed API contracts
- file generation/download lifecycle
