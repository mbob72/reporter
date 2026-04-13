# Reporting Platform Architecture

## Overview

This project implements a reporting platform designed to:

- support multi-tenant data access
- enforce strict security boundaries
- separate report logic from infrastructure
- allow independent evolution of:
  - platform
  - data-access
  - report definitions

The platform is built as an Nx monorepo with clear separation between:
- applications (API, UI)
- platform libraries
- report implementations

---

## Core Principle

**Reports are pure business logic.**

Reports must NOT:
- access databases directly
- use credentials
- construct arbitrary queries
- call external APIs directly

Reports operate only through a **controlled runtime** provided by the platform.

---

## High-Level Architecture

```txt
apps/
  report-api       → NestJS API (entry point)
  report-web       → React UI

libs/
  report-platform/
    contracts      → shared types & validation schemas
    auth           → user resolution & access policy
    data-access    → repositories (DB access layer)
    registry       → report discovery & execution mapping
    api-client     → frontend client for API

  report-definitions/
    <report-name>  → individual report implementations
```

---

## Execution Flow

1. User triggers report execution via UI
2. API:
   - resolves current user
   - validates input
   - finds report by `reportCode`
3. Platform:
   - applies access rules
   - calls report definition
4. Report:
   - uses repositories to fetch data
   - returns structured result
5. API returns response to UI

---

## Report Definition Model

Each report is defined as:

```ts
type ReportDefinition<TResult = unknown> = {
  code: string;
  title: string;
  description: string;
  launch: (currentUser: CurrentUser, params: unknown) => Promise<TResult>;
};
```

Key idea:
- `code` is the stable identifier
- `launch` is the entry point
- report is stateless and pure (given inputs + repositories)

---

## Report Registry

The platform uses a registry to manage reports:

```ts
class ReportRegistry {
  listReports(): ReportListItem[];
  getReport(code: string): ReportDefinition | undefined;
}
```

Responsibilities:
- store all available reports
- expose list for UI
- resolve report by `reportCode`

---

## API Design

### List Reports

```http
GET /reports
```

Response:

```json
[
  {
    "code": "simple-sales-summary",
    "title": "Simple Sales Summary",
    "description": "Shows tenant, organization, and current sales amount"
  }
]
```

---

### Launch Report

```http
POST /reports/:reportCode/launch
```

Body:

```json
{
  "params": { ... }
}
```

---

## Contracts Layer (`report-platform/contracts`)

Contains:
- shared types
- zod schemas
- API contracts

Examples:
- `CurrentUser`
- `Role`
- `ApiError`
- `ReportListItem`
- `LaunchReportBody`

### Rule

Contracts must be:
- stable
- framework-independent
- reused across API, UI, and reports

---

## Auth Layer (`report-platform/auth`)

Responsibilities:
- resolve current user (mock for now)
- enforce access rules

Example:

```ts
function canAccessTenantData(user, tenantId): boolean
```

### Rule

Auth logic:
- must not depend on DB
- must be deterministic
- must be reusable across platform

---

## Data Access Layer (`report-platform/data-access`)

Contains:
- repository interfaces
- repository implementations (mock for now)

Example:

```ts
interface SalesRepository {
  getCurrentSalesAmount(user, tenantId, organizationId): Promise<number>;
}
```

### Responsibilities

Repositories must:
- enforce tenant access
- enforce role restrictions
- control available queries

### Critical Rule

Reports must NOT:
- bypass repositories
- access DB clients directly

---

## Report Definitions (`report-definitions/*`)

Each report lives in its own module:

```txt
simple-sales-summary/
  contract.ts
  service.ts
  definition.ts
```

### Responsibilities

- validate params
- orchestrate repository calls
- format result

### Example

```ts
const report = {
  code: 'simple-sales-summary',
  async launch(user, params) {
    return service.run(user, params);
  }
};
```

---

## Dependency Rules

### Allowed

```txt
report-definitions → contracts
report-definitions → data-access
report-api → platform libs
report-web → contracts + api-client
```

### Forbidden

```txt
report-definitions → direct DB access
report-definitions → external APIs
report-definitions → infrastructure
```

---

## Security Model

Security is enforced in layers:

1. **User identity**
2. **Role-based access**
3. **Tenant scoping**
4. **Repository-level enforcement**

Even if a report is implemented incorrectly,
it must NOT be able to access unauthorized data.

---

## API Client (`report-platform/api-client`)

Frontend interacts via:

```ts
listReports()
launchReport(reportCode, params)
```

Responsibilities:
- validate inputs
- handle API errors
- normalize responses

---

## UI Responsibilities (`report-web`)

- fetch report list
- allow report selection
- collect params
- trigger execution
- render result

UI must NOT:
- contain business logic
- know about repositories
- bypass API

---

## Design Constraints

- No raw DB access in reports
- No credential exposure
- All data access via repositories
- All inputs validated via zod
- All layers loosely coupled

---

## Testing Strategy

Reports must be testable via mocks:

```ts
const mockRuntime = {
  repositories: { ... }
};
```

This allows:
- unit testing report logic
- no dependency on real DB
- fast feedback loop

---

## Future Extensions

Planned evolution:

- async report execution (queues, workers)
- audit logging
- caching
- report versioning
- UI-driven report configuration
- query tracing

---

## Summary

This architecture ensures:

- strong separation of concerns
- safe data access
- scalable report development
- clear extension points

The platform guarantees that:

> Even if a report is implemented incorrectly,
> it cannot access unauthorized data.
