# Report API Module Structure

## Purpose

Документ фиксирует текущую модульную структуру `apps/report-api` после перехода на queue-based runtime (`BullMQ + Redis + отдельный worker process`).

Границы:

- публичные HTTP-контракты не менялись;
- бизнес-source of truth статусов остается `FileSystemReportInstanceStore`;
- выполнение отчетов вынесено из API request-process в queue/worker.

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
│  │  ├─ ReportRegistryModule
│  │  │  ├─ DataAccessModule
│  │  │  └─ ExternalServicesModule
│  │  └─ ReportQueueModule
│  ├─ ReportPersistenceModule
│  ├─ ReportRegistryModule
│  ├─ ExternalServicesModule
│  └─ DataAccessModule
└─ ReportRunsModule
   └─ ReportPersistenceModule

WorkerAppModule (separate process)
├─ ReportPersistenceModule
├─ ReportRegistryModule
│  ├─ DataAccessModule
│  └─ ExternalServicesModule
└─ providers: ReportJobProcessor, ReportWorkerRuntimeService
```

Код:

- `AppModule`: [`app.module.ts#L16`](../apps/report-api/src/app.module.ts#L16)
- `ReportsModule`: [`reports.module.ts#L13`](../apps/report-api/src/modules/reports.module.ts#L13)
- `ReportOrchestrationModule`: [`report-orchestration.module.ts#L18`](../apps/report-api/src/modules/report-orchestration.module.ts#L18)
- `ReportQueueModule`: [`report-queue.module.ts#L6`](../apps/report-api/src/modules/report-queue.module.ts#L6)
- `WorkerAppModule`: [`worker-app.module.ts#L8`](../apps/report-api/src/modules/worker-app.module.ts#L8)

## Cross-Cutting HTTP Layer

Global pipeline в `AppModule`:

- `APP_GUARD -> JwtAuthGuard`: [`app.module.ts#L26`](../apps/report-api/src/app.module.ts#L26)
- `APP_FILTER -> ApiExceptionFilter`: [`app.module.ts#L30`](../apps/report-api/src/app.module.ts#L30)
- `APP_INTERCEPTOR -> RequestLoggingInterceptor`: [`app.module.ts#L34`](../apps/report-api/src/app.module.ts#L34)
- `RequestIdMiddleware` на все маршруты: [`app.module.ts#L40`](../apps/report-api/src/app.module.ts#L40)

Public endpoints:

- `GET /health`: [`health.controller.ts#L7`](../apps/report-api/src/health.controller.ts#L7)
- `POST /auth/dev-token`: [`auth.controller.ts#L24`](../apps/report-api/src/auth.controller.ts#L24)
- `POST /auth/refresh`: [`auth.controller.ts#L42`](../apps/report-api/src/auth.controller.ts#L42)
- `POST /auth/logout`: [`auth.controller.ts#L65`](../apps/report-api/src/auth.controller.ts#L65)

## Imports / Exports and Tokens

### `AuthModule`

- Imports: `JwtModule.register(...)` ([`auth.module.ts#L9`](../apps/report-api/src/modules/auth.module.ts#L9))
- Providers: `DevAuthService` ([`auth.module.ts#L10`](../apps/report-api/src/modules/auth.module.ts#L10))
- Controllers: `AuthController`

### `HealthModule`

- Controllers: `HealthController` ([`health.module.ts#L6`](../apps/report-api/src/modules/health.module.ts#L6))

### `DataAccessModule`

- Providers/exports: `TENANT_REPOSITORY_TOKEN`, `SALES_REPOSITORY_TOKEN`, `PRODUCTS_REPOSITORY_TOKEN`, `CHANNELS_REPOSITORY_TOKEN`.

### `ExternalServicesModule`

- Providers/exports: `SHARED_SETTINGS_PROVIDER_TOKEN`, `EXTERNAL_CLIENT_FACTORY_TOKEN`.

### `ReportPersistenceModule`

- Provider: `REPORT_INSTANCE_STORE_TOKEN -> FileSystemReportInstanceStore`:
  [`report-persistence.module.ts#L9`](../apps/report-api/src/modules/report-persistence.module.ts#L9)
- Exports: `REPORT_INSTANCE_STORE_TOKEN`.

### `ReportRegistryModule`

- Imports: `DataAccessModule`, `ExternalServicesModule` ([`report-registry.module.ts#L32`](../apps/report-api/src/modules/report-registry.module.ts#L32))
- Providers:
  - `SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN` ([`report-registry.module.ts#L35`](../apps/report-api/src/modules/report-registry.module.ts#L35))
  - `REPORT_REGISTRY_TOKEN` ([`report-registry.module.ts#L40`](../apps/report-api/src/modules/report-registry.module.ts#L40))
- Exports: оба токена ([`report-registry.module.ts#L67`](../apps/report-api/src/modules/report-registry.module.ts#L67)).

### `ReportQueueModule`

- Provider: `REPORT_JOB_QUEUE_TOKEN -> ReportJobQueue`:
  [`report-queue.module.ts#L9`](../apps/report-api/src/modules/report-queue.module.ts#L9)
- Exports: `REPORT_JOB_QUEUE_TOKEN`.

### `ReportOrchestrationModule`

- Imports: `ReportPersistenceModule`, `ReportRegistryModule`, `ReportQueueModule`:
  [`report-orchestration.module.ts#L19`](../apps/report-api/src/modules/report-orchestration.module.ts#L19)
- Provider: `REPORT_INSTANCE_RUNNER_TOKEN` c inject `[STORE, DATASET_ROTATION, JOB_QUEUE]`:
  [`report-orchestration.module.ts#L22`](../apps/report-api/src/modules/report-orchestration.module.ts#L22)
- Exports: `REPORT_INSTANCE_RUNNER_TOKEN`.

### `ReportsModule`

- Imports: `ReportOrchestrationModule`, `ReportPersistenceModule`, `ReportRegistryModule`, `ExternalServicesModule`, `DataAccessModule`:
  [`reports.module.ts#L14`](../apps/report-api/src/modules/reports.module.ts#L14)
- Providers: `ReportsQueryService`, `ReportsLaunchService`, `GeneratedFilesService`:
  [`reports.module.ts#L21`](../apps/report-api/src/modules/reports.module.ts#L21)
- Controllers: `ReportsController`.

### `ReportRunsModule`

- Imports: `ReportPersistenceModule` ([`report-runs.module.ts#L8`](../apps/report-api/src/modules/report-runs.module.ts#L8))
- Providers: `ReportRunsQueryService` ([`report-runs.module.ts#L9`](../apps/report-api/src/modules/report-runs.module.ts#L9))
- Controllers: `ReportRunsController`.

### `WorkerAppModule` (worker process)

- Imports: `ReportPersistenceModule`, `ReportRegistryModule` ([`worker-app.module.ts#L9`](../apps/report-api/src/modules/worker-app.module.ts#L9))
- Providers: `ReportJobProcessor`, `ReportWorkerRuntimeService` ([`worker-app.module.ts#L10`](../apps/report-api/src/modules/worker-app.module.ts#L10))
- Runtime start: [`report-worker.main.ts#L12`](../apps/report-api/src/report-worker.main.ts#L12).

## Responsibility Matrix

| Endpoint / Runtime                   | Module              | Service / Method                             | Main dependencies                                       |
| ------------------------------------ | ------------------- | -------------------------------------------- | ------------------------------------------------------- |
| `POST /auth/dev-token`               | `AuthModule`        | `DevAuthService.issueDevToken`               | `JwtModule`, `mockUsers`                                |
| `POST /auth/refresh`                 | `AuthModule`        | `DevAuthService.refreshSession`              | `JwtModule`, refresh-session store                      |
| `POST /auth/logout`                  | `AuthModule`        | `DevAuthService.revokeSession`               | refresh-session store                                   |
| `GET /health`                        | `HealthModule`      | `HealthController.getHealth`                 | -                                                       |
| `GET /reports`                       | `ReportsModule`     | `ReportsQueryService.listReports`            | `REPORT_REGISTRY_TOKEN`                                 |
| `GET /reports/:code/metadata`        | `ReportsModule`     | `ReportsQueryService.getReportMetadata`      | `REPORT_REGISTRY_TOKEN`                                 |
| `POST /reports/:reportCode/launch`   | `ReportsModule`     | `ReportsLaunchService.launchReport`          | `REPORT_REGISTRY_TOKEN`, `REPORT_INSTANCE_RUNNER_TOKEN` |
| enqueue в BullMQ                     | `ReportQueueModule` | `ReportJobQueue.enqueue`                     | `resolveReportQueueConfig`, Redis                       |
| job execution                        | `WorkerAppModule`   | `ReportJobProcessor.process`                 | `REPORT_REGISTRY_TOKEN`, `REPORT_INSTANCE_STORE_TOKEN`  |
| `GET /reports/:reportCode/instances` | `ReportsModule`     | `ReportsQueryService.listReportInstances...` | `REPORT_INSTANCE_STORE_TOKEN`, `REPORT_REGISTRY_TOKEN`  |
| `GET /generated-files/:fileId`       | `ReportsModule`     | `GeneratedFilesService.getGeneratedFile`     | `REPORT_INSTANCE_STORE_TOKEN`                           |
| `GET /report-runs/:reportInstanceId` | `ReportRunsModule`  | `ReportRunsQueryService.getReportInstance`   | `REPORT_INSTANCE_STORE_TOKEN`                           |

## Boundary Rules

- Controllers остаются thin adapters: validate -> delegate.
- Модуль очереди отделен от orchestration (`ReportQueueModule` vs `ReportOrchestrationModule`).
- `report-api` не выполняет тяжелый report computation; только enqueue и read APIs.
- `WorkerAppModule` изолирует execution runtime в отдельном процессе.
- Смена storage backend делается на уровне provider в `ReportPersistenceModule`, без изменения контроллеров.
