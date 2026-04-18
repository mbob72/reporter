# How To Add A New Report

This guide describes the required steps to add a new report in this repository.

It is intentionally concrete and aligned with the current implementation.

## 1. Create Report Module In `report-definitions`

Create a new library folder:

```txt
libs/report-definitions/<report-code>/
  src/
    <report-code>.contract.ts
    <report-code>.service.ts
    <report-code>.definition.ts
    index.ts
```

Use existing reports as references:

- `simple-sales-summary`
- `simple-sales-summary-xlsx`

## 2. Define Input/Output Contracts (Zod)

In `<report-code>.contract.ts` define:

- `ParamsSchema`
- `ResultSchema`
- exported TS types via `z.infer`

Rules:

- `params` must always be validated in `definition.ts` before launching service logic.
- service output must always be validated against `ResultSchema` before returning from `launch`.
- validation failures should throw `ApiError` with `code: 'VALIDATION_ERROR'`.

## 3. Build Report Service

In `<report-code>.service.ts`:

- keep business logic in the service
- inject dependencies through constructor
- do not place HTTP/controller logic inside service

The service may call repositories for internal data and external clients for third-party data.

## 4. Internal Data Access: Repositories Only

For internal DB-like data:

- report code must use `@report-platform/data-access` repositories
- report code must not create direct DB connections
- report code must not handle internal DB credentials

The launching user scope is always used for internal access control:

- pass `currentUser` into repository methods
- repository layer enforces role/tenant restrictions

If a required repository does not exist yet, add it first:

```txt
libs/report-platform/data-access/src/
  <entity>.repository.ts
  <entity>.repository.mock.ts
```

Then export it from:

- `libs/report-platform/data-access/src/index.ts`

## 5. External Resources: Use Controlled Credential Flow

External access must be done through platform services/clients, not raw ad-hoc calls.

Credential modes:

- `manual`: explicit username/password in launch params
- `shared_setting`: reference to credentials stored in the platform

Expected params shape (example):

```json
{
  "accountId": "ACC-101",
  "credentials": {
    "mode": "shared_setting",
    "sharedSettingId": "broker-tenant-1-primary"
  }
}
```

or

```json
{
  "accountId": "ACC-101",
  "credentials": {
    "mode": "manual",
    "username": "user1",
    "password": "secret"
  }
}
```

Implementation pattern:

1. Declare external dependency in report metadata.
2. Resolve/build external client via `ExternalClientFactory`.
3. Pass typed client into report service.

## 6. Implement Report Definition

In `<report-code>.definition.ts`, return a `ReportDefinition` object with:

- `code`
- `title`
- `description`
- `getMetadata(currentUser)`
- `launch(currentUser, params)`

`getMetadata` must include:

- `minRoleToLaunch`
- `fields` (input model used by frontend)
- `externalDependencies` (if external services are used)

`launch` flow must be:

1. validate params
2. prepare dependencies (repositories/external clients)
3. call service
4. validate result
5. return validated data

## 7. Register Report In API Providers

Register the new report in:

- `apps/report-api/src/reporting.providers.ts`

Tasks:

1. add required providers/tokens (repositories, factories, other dependencies)
2. create report definition via `create<ReportName>Definition(...)`
3. include it in `new ReportRegistry([...])`

If the report is not added to `ReportRegistry`, API cannot launch it.

## 8. Frontend Integration (Beyond Step 1)

Current step 1 (select user/report) already exists. For new reports, extend later steps:

1. fetch report metadata via `getReportMetadata(reportCode, ...)`
2. build input UI from `metadata.fields`
3. if tenant/org fields are present:
   - load tenants via `listTenants`
   - load organizations via `listOrganizations`
4. if `externalDependencies` are present:
   - show credential mode switch (`manual` vs `shared_setting`)
   - load shared options via `listSharedSettings`
5. build final `params` payload matching report `ParamsSchema`
6. launch via `launchReport`

Main frontend/API-client paths:

- `apps/report-web/src/App.tsx`
- `libs/report-platform/api-client/src/get-report-metadata.ts`
- `libs/report-platform/api-client/src/list-tenants.ts`
- `libs/report-platform/api-client/src/list-organizations.ts`
- `libs/report-platform/api-client/src/list-shared-settings.ts`
- `libs/report-platform/api-client/src/launch-report.ts`

## 9. XLSX Report Variant (If Needed)

If the report output is a generated XLSX file, add:

```txt
libs/report-definitions/<report-code>/
  template-assets/
    <template>.xlsx
  src/
    <report-code>.source.ts
    <report-code>.template.ts
    <report-code>.definition.ts
```

Concept:

- XLSX template is a stable part of report data model
- source data is injected into template
- formulas are recalculated
- report returns `BuiltFile`
- API stores file and returns downloadable metadata

## 10. Required Completion Checklist

A report is considered integrated only if all items are true:

- appears in `GET /reports`
- returns valid metadata from `GET /reports/:code/metadata`
- launches successfully through `POST /reports/:reportCode/launch` for allowed roles
- returns `FORBIDDEN` for disallowed roles
- validates params/result with zod
- uses repositories for internal data access (no direct DB access)
- uses controlled external credential flow when third-party APIs are involved
