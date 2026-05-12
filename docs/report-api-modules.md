# Report API Module Structure

## Purpose

Этот документ фиксирует текущую модульную структуру `apps/report-api` после рефакторинга.

Границы этого дизайна:

- публичные HTTP-контракты не меняются;
- пути endpoint остаются прежними;
- `FileSystemReportInstanceStore` пока остается текущей реализацией стора.

## Module Graph

```text
                           +------------------+
                           |    AppModule     |
                           | (imports only)   |
                           +---------+--------+
                                     |
      +------------------------------+------------------------------+
      |                              |                              |
+-----v------+               +-------v-------+              +-------v--------+
| HealthModule|              | ReportsModule |              | ReportRunsModule|
+------------+               +-------+-------+              +--------+--------+
                                     |                               |
                                     | uses                          | uses
                           +---------v-------------------------------v---------+
                           |              ReportOrchestrationModule             |
                           |   (ReportInstanceRunner, LaunchExecutor, etc.)    |
                           +--------------------+-------------------------------+
                                                |
                                                | needs
                           +--------------------v--------------------+
                           |          ReportPersistenceModule         |
                           |       (ReportInstanceStorePort -> FS)    |
                           +--------------------+--------------------+
                                                |
                     +--------------------------+--------------------------+
                     |                                                     |
         +-----------v-----------+                             +-----------v-----------+
         |   ReportRegistryModule|                             | ExternalServicesModule|
         |   (ReportRegistry)    |<---------uses---------------| (SharedSettings,      |
         +-----------+-----------+                             |  ExternalClientFactory)|
                     |                                         +------------------------+
                     | uses
         +-----------v-----------+
         |   DataAccessModule    |
         | (Tenant/Sales/etc)    |
         +-----------------------+
```

## Imports/Exports and Tokens

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
  - токен должен скрывать concrete storage implementation;
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
  - `HealthModule`
  - `ReportsModule`
  - `ReportRunsModule`

## Responsibility Matrix

| Endpoint                                                                 | Module             | Service                                         | Main Dependencies                                         |
| ------------------------------------------------------------------------ | ------------------ | ----------------------------------------------- | --------------------------------------------------------- |
| `GET /health`                                                            | `HealthModule`     | -                                               | -                                                         |
| `GET /reports`                                                           | `ReportsModule`    | `ReportsQueryService.listReports`               | `REPORT_REGISTRY_TOKEN`                                   |
| `GET /reports/:code/metadata`                                            | `ReportsModule`    | `ReportsQueryService.getReportMetadata`         | `REPORT_REGISTRY_TOKEN`                                   |
| `GET /reports/:reportCode/external-services/:serviceKey/shared-settings` | `ReportsModule`    | `ReportsQueryService.listSharedSettings`        | `REPORT_REGISTRY_TOKEN`, `SHARED_SETTINGS_PROVIDER_TOKEN` |
| `GET /tenants`                                                           | `ReportsModule`    | `ReportsQueryService.listTenants`               | `TENANT_REPOSITORY_TOKEN`                                 |
| `GET /tenants/:tenantId/organizations`                                   | `ReportsModule`    | `ReportsQueryService.listOrganizationsByTenant` | `TENANT_REPOSITORY_TOKEN`                                 |
| `POST /reports/:reportCode/launch`                                       | `ReportsModule`    | `ReportsLaunchService.launchReport`             | `REPORT_REGISTRY_TOKEN`, `REPORT_INSTANCE_RUNNER_TOKEN`   |
| `GET /reports/:reportCode/instances`                                     | `ReportsModule`    | `ReportsQueryService.listReportInstances`       | `REPORT_REGISTRY_TOKEN`, `REPORT_INSTANCE_STORE_TOKEN`    |
| `GET /generated-files/:fileId`                                           | `ReportsModule`    | `GeneratedFilesService.downloadGeneratedFile`   | `REPORT_INSTANCE_STORE_TOKEN`                             |
| `GET /report-runs/:reportInstanceId`                                     | `ReportRunsModule` | `ReportRunsQueryService.getReportInstance`      | `REPORT_INSTANCE_STORE_TOKEN`                             |

## Boundary Rules

- Controllers остаются thin adapters: request parsing, delegation в сервис, HTTP response mapping.
- Feature services не создают инфраструктурные зависимости напрямую; только через токены и module imports.
- `ReportsModule` не должен зависеть от concrete filesystem implementation стора.
- `ReportOrchestrationModule` содержит orchestration flow, но не HTTP-specific mapping.
- Переход на другой storage backend в будущем должен происходить заменой provider в `ReportPersistenceModule` без изменения контроллеров.
