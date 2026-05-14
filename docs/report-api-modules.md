# Report API Module Structure

## Purpose

Этот документ фиксирует текущую модульную структуру `apps/report-api` после рефакторинга auth/validation/error handling.

Границы этого дизайна:

- публичные HTTP-контракты business endpoint-ов сохраняются;
- `FileSystemReportInstanceStore` пока остается текущей реализацией стора;
- demo auth bootstrap (`POST /auth/dev-token`) остается dev-only endpoint-ом.

## Module Graph

```text
AppModule
├─ JwtModule
├─ AuthModule
│  └─ JwtModule
├─ HealthModule
├─ ReportsModule
│  ├─ ReportOrchestrationModule
│  │  ├─ ReportPersistenceModule
│  │  └─ ReportRegistryModule
│  │     ├─ DataAccessModule
│  │     └─ ExternalServicesModule
│  ├─ ReportPersistenceModule
│  ├─ ReportRegistryModule
│  ├─ ExternalServicesModule
│  └─ DataAccessModule
└─ ReportRunsModule
   └─ ReportPersistenceModule
```

## Cross-Cutting HTTP Layer

Регистрируется в `AppModule` как global pipeline:

- `APP_GUARD` -> `JwtAuthGuard`;
- `APP_FILTER` -> `ApiExceptionFilter`;
- `APP_INTERCEPTOR` -> `RequestLoggingInterceptor`;
- `RequestIdMiddleware` на все роуты.

Дополнительно:

- `GET /health` и `POST /auth/dev-token` помечены `@Public()`;
- все business endpoints требуют `Authorization: Bearer <token>`.

## Imports/Exports and Tokens

### `AuthModule`

- Imports:
  - `JwtModule.register(...)`
- Providers:
  - `DevAuthService`
- Controllers:
  - `AuthController`
- Exports: `-`

### `HealthModule`

- Imports: `-`
- Providers: `-`
- Exports: `-`
- Controllers: `HealthController`

### `DataAccessModule`

- Imports: `-`
- Providers:
  - `TENANT_REPOSITORY_TOKEN`
  - `SALES_REPOSITORY_TOKEN`
  - `PRODUCTS_REPOSITORY_TOKEN`
  - `CHANNELS_REPOSITORY_TOKEN`
- Exports:
  - `TENANT_REPOSITORY_TOKEN`
  - `SALES_REPOSITORY_TOKEN`
  - `PRODUCTS_REPOSITORY_TOKEN`
  - `CHANNELS_REPOSITORY_TOKEN`

### `ExternalServicesModule`

- Imports: `-`
- Providers:
  - `SHARED_SETTINGS_PROVIDER_TOKEN`
  - `EXTERNAL_CLIENT_FACTORY_TOKEN`
- Exports:
  - `SHARED_SETTINGS_PROVIDER_TOKEN`
  - `EXTERNAL_CLIENT_FACTORY_TOKEN`

### `ReportPersistenceModule`

- Imports: `-`
- Providers:
  - `REPORT_INSTANCE_STORE_TOKEN`
- Exports:
  - `REPORT_INSTANCE_STORE_TOKEN`
- Note:
  - токен скрывает concrete storage implementation;
  - текущий adapter: `FileSystemReportInstanceStore`.

### `ReportRegistryModule`

- Imports:
  - `DataAccessModule`
  - `ExternalServicesModule`
- Providers:
  - `SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN`
  - `REPORT_REGISTRY_TOKEN`
- Exports:
  - `SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN`
  - `REPORT_REGISTRY_TOKEN`

### `ReportOrchestrationModule`

- Imports:
  - `ReportPersistenceModule`
  - `ReportRegistryModule`
- Providers:
  - `REPORT_INSTANCE_RUNNER_TOKEN`
- Exports:
  - `REPORT_INSTANCE_RUNNER_TOKEN`

### `ReportsModule`

- Imports:
  - `ReportOrchestrationModule`
  - `ReportPersistenceModule`
  - `ReportRegistryModule`
  - `ExternalServicesModule`
  - `DataAccessModule`
- Providers:
  - `ReportsQueryService`
  - `ReportsLaunchService`
  - `GeneratedFilesService`
- Controllers:
  - `ReportsController`
- Exports: `-`

### `ReportRunsModule`

- Imports:
  - `ReportPersistenceModule`
- Providers:
  - `ReportRunsQueryService`
- Controllers:
  - `ReportRunsController`
- Exports: `-`

### `AppModule`

- Imports:
  - `JwtModule.register(...)`
  - `AuthModule`
  - `HealthModule`
  - `ReportsModule`
  - `ReportRunsModule`
- Providers:
  - `APP_GUARD`
  - `APP_FILTER`
  - `APP_INTERCEPTOR`

## Responsibility Matrix

| Endpoint                                                                 | Module             | Service / Controller Method                           | Main Dependencies                                         |
| ------------------------------------------------------------------------ | ------------------ | ----------------------------------------------------- | --------------------------------------------------------- |
| `POST /auth/dev-token`                                                   | `AuthModule`       | `DevAuthService.issueDevToken`                        | `JwtModule`, `mockUsers`                                  |
| `GET /health`                                                            | `HealthModule`     | `HealthController.getHealth`                          | -                                                         |
| `GET /reports`                                                           | `ReportsModule`    | `ReportsQueryService.listReports`                     | `REPORT_REGISTRY_TOKEN`                                   |
| `GET /reports/:code/metadata`                                            | `ReportsModule`    | `ReportsQueryService.getReportMetadata`               | `REPORT_REGISTRY_TOKEN`                                   |
| `GET /reports/:reportCode/external-services/:serviceKey/shared-settings` | `ReportsModule`    | `ReportsQueryService.listSharedSettings`              | `REPORT_REGISTRY_TOKEN`, `SHARED_SETTINGS_PROVIDER_TOKEN` |
| `GET /tenants`                                                           | `ReportsModule`    | `ReportsQueryService.listTenants`                     | `getAllTenants()` from `@report-platform/data-access`     |
| `GET /tenants/:tenantId/organizations`                                   | `ReportsModule`    | `ReportsQueryService.listOrganizationsByTenant`       | `getOrganizationsByTenant()` + auth scope checks          |
| `POST /reports/:reportCode/launch`                                       | `ReportsModule`    | `ReportsLaunchService.launchReport`                   | `REPORT_REGISTRY_TOKEN`, `REPORT_INSTANCE_RUNNER_TOKEN`   |
| `GET /reports/:reportCode/instances`                                     | `ReportsModule`    | `ReportsQueryService.listReportInstancesByReportCode` | `REPORT_REGISTRY_TOKEN`, `REPORT_INSTANCE_STORE_TOKEN`    |
| `GET /generated-files/:fileId`                                           | `ReportsModule`    | `GeneratedFilesService.getGeneratedFile`              | `REPORT_INSTANCE_STORE_TOKEN`                             |
| `GET /report-runs/:reportInstanceId`                                     | `ReportRunsModule` | `ReportRunsQueryService.getReportInstance`            | `REPORT_INSTANCE_STORE_TOKEN`                             |

## Boundary Rules

- Controllers остаются thin adapters: validated request -> service call.
- HTTP transport concerns (auth/validation/error/logging/request-id) централизованы в global layer.
- Feature services не создают инфраструктурные зависимости напрямую; только через токены/module imports.
- `ReportsModule` не должен зависеть от concrete filesystem implementation стора.
- Переход на другой storage backend должен происходить заменой provider в `ReportPersistenceModule` без изменения контроллеров.
