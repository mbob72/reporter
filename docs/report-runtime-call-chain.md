# Report Runtime Call Chain

Ниже актуальный call-chain после перехода на `BullMQ + Redis + отдельный worker`.

## 1. Глобальный HTTP pipeline (business endpoints)

1. `RequestIdMiddleware` добавляет/пробрасывает `x-request-id`:
   [`request-id.middleware.ts#L13`](../apps/report-api/src/common/middleware/request-id.middleware.ts#L13).
2. `JwtAuthGuard` валидирует `Authorization: Bearer <token>` и кладет `CurrentUser` в `request.user`:
   [`jwt-auth.guard.ts#L22`](../apps/report-api/src/common/auth/jwt-auth.guard.ts#L22),
   [`jwt-auth.guard.ts#L42`](../apps/report-api/src/common/auth/jwt-auth.guard.ts#L42),
   [`jwt-auth.guard.ts#L65`](../apps/report-api/src/common/auth/jwt-auth.guard.ts#L65).
3. `@CurrentUser()` извлекает пользователя из request context:
   [`current-user.decorator.ts#L9`](../apps/report-api/src/common/auth/current-user.decorator.ts#L9).
4. `RolesGuard` применяет декларативные role-ограничения через `@Roles(...)`:
   [`roles.guard.ts`](../apps/report-api/src/common/auth/roles.guard.ts),
   [`roles.decorator.ts`](../apps/report-api/src/common/auth/roles.decorator.ts).
5. Route-level `ZodValidationPipe` валидирует `@Param/@Body`:
   [`zod-validation.pipe.ts#L5`](../apps/report-api/src/common/pipes/zod-validation.pipe.ts#L5).
6. Thin controllers делегируют в services:
   [`reports.controller.ts#L20`](../apps/report-api/src/reports.controller.ts#L20),
   [`report-runs.controller.ts#L8`](../apps/report-api/src/report-runs.controller.ts#L8).
7. `ApiExceptionFilter` маппит доменные/transport ошибки в API response:
   [`api-exception.filter.ts#L34`](../apps/report-api/src/common/filters/api-exception.filter.ts#L34).
8. `RequestLoggingInterceptor` пишет structured request logs:
   [`request-logging.interceptor.ts#L22`](../apps/report-api/src/common/interceptors/request-logging.interceptor.ts#L22).
9. Глобальная регистрация pipeline в `AppModule`:
   [`app.module.ts#L16`](../apps/report-api/src/app.module.ts#L16),
   [`app.module.ts#L24`](../apps/report-api/src/app.module.ts#L24),
   [`app.module.ts#L40`](../apps/report-api/src/app.module.ts#L40).

## 2. Launch flow (`POST /reports/:reportCode/launch`)

1. Endpoint принимает `reportCode`, `LaunchReportBody`, `@CurrentUser()`:
   [`reports.controller.ts#L74`](../apps/report-api/src/reports.controller.ts#L74).
2. Controller делегирует в `ReportsLaunchService.launchReport(...)`:
   [`reports.controller.ts#L83`](../apps/report-api/src/reports.controller.ts#L83),
   [`reports-launch.service.ts#L19`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L19).
3. Service делает domain checks:
   - report exists: [`reports-launch.service.ts#L20`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L20)
   - role access: [`reports-launch.service.ts#L31`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L31)
   - launch params schema: [`reports-launch.service.ts#L38`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L38)
4. Service вызывает `ReportInstanceRunner.start(...)`:
   [`reports-launch.service.ts#L47`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L47).
5. Runner:
   - генерирует `reportInstanceId`: [`report-instance.runner.ts#L42`](../apps/report-api/src/report-instance.runner.ts#L42)
   - создает queued instance в store: [`report-instance.runner.ts#L44`](../apps/report-api/src/report-instance.runner.ts#L44)
   - enqueue job в BullMQ: [`report-instance.runner.ts#L49`](../apps/report-api/src/report-instance.runner.ts#L49)
   - возвращает `{ reportInstanceId, status: 'queued' }`: [`report-instance.runner.ts#L56`](../apps/report-api/src/report-instance.runner.ts#L56)
6. Queue adapter публикует job с `jobId=reportInstanceId`, `attempts`, `backoff`:
   [`report-job.queue.ts#L22`](../apps/report-api/src/report-job.queue.ts#L22),
   [`report-job.queue.ts#L24`](../apps/report-api/src/report-job.queue.ts#L24),
   [`report-job.queue.ts#L25`](../apps/report-api/src/report-job.queue.ts#L25).

## 3. Worker execution flow (BullMQ processor)

1. Worker процесс стартует через отдельный entrypoint:
   [`report-worker.main.ts#L8`](../apps/report-api/src/report-worker.main.ts#L8).
2. Поднимается `Nest ApplicationContext` c `WorkerAppModule`:
   [`report-worker.main.ts#L9`](../apps/report-api/src/report-worker.main.ts#L9),
   [`worker-app.module.ts#L8`](../apps/report-api/src/modules/worker-app.module.ts#L8).
3. `ReportWorkerRuntimeService.start()` создает BullMQ `Worker`:
   [`report-worker-runtime.service.ts#L14`](../apps/report-api/src/modules/report-worker/services/report-worker-runtime.service.ts#L14),
   [`report-worker-runtime.service.ts#L19`](../apps/report-api/src/modules/report-worker/services/report-worker-runtime.service.ts#L19).
4. На каждый job runtime вызывает `ReportJobProcessor.process(job)`:
   [`report-worker-runtime.service.ts#L22`](../apps/report-api/src/modules/report-worker/services/report-worker-runtime.service.ts#L22),
   [`report-job.processor.ts#L36`](../apps/report-api/src/report-job.processor.ts#L36).
5. Processor lifecycle:
   - `markRunning`: [`report-job.processor.ts#L40`](../apps/report-api/src/report-job.processor.ts#L40)
   - вызов `executeReportLaunchInWorker(...)`: [`report-job.processor.ts#L42`](../apps/report-api/src/report-job.processor.ts#L42)
   - progress updates в store: [`report-job.processor.ts#L47`](../apps/report-api/src/report-job.processor.ts#L47)
   - `saveArtifact` + `markCompleted`: [`report-job.processor.ts#L58`](../apps/report-api/src/report-job.processor.ts#L58), [`report-job.processor.ts#L72`](../apps/report-api/src/report-job.processor.ts#L72)
   - на ошибке `markFailed` и rethrow: [`report-job.processor.ts#L74`](../apps/report-api/src/report-job.processor.ts#L74)
6. Где реально вызывается `reportDefinition.launch(...)`:
   [`report-launch.executor.ts#L43`](../apps/report-api/src/report-launch.executor.ts#L43).

## 4. Read flows

1. `GET /report-runs/:reportInstanceId`:
   [`report-runs.controller.ts#L14`](../apps/report-api/src/report-runs.controller.ts#L14),
   [`report-runs-query.service.ts#L15`](../apps/report-api/src/modules/report-runs/services/report-runs-query.service.ts#L15).
2. `GET /generated-files/:fileId`:
   [`reports.controller.ts#L95`](../apps/report-api/src/reports.controller.ts#L95),
   [`generated-files.service.ts#L15`](../apps/report-api/src/modules/reports/services/generated-files.service.ts#L15).
3. List/read endpoints (`/reports`, `/metadata`, `/tenants`, `/organizations`, `/shared-settings`, `/instances`) обслуживает `ReportsQueryService`:
   [`reports-query.service.ts#L33`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L33),
   [`reports-query.service.ts#L44`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L44),
   [`reports-query.service.ts#L63`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L63),
   [`reports-query.service.ts#L99`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L99),
   [`reports-query.service.ts#L113`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L113),
   [`reports-query.service.ts#L124`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L124).

## 5. Runtime status flow (`GET /admin/worker-pool/status`)

1. Endpoint находится в `RuntimeStatusController` и защищен `@Roles('Admin')`:
   [`runtime-status.controller.ts`](../apps/report-api/src/runtime-status.controller.ts).
2. `WorkerPoolStatusService` агрегирует:
   - queue counters из BullMQ (`ReportJobQueue.getJobCounts()`),
   - текущий snapshot state manager (`WorkerPoolStateService`).
3. `WorkerAutoscalingPolicyService` в фоне обновляет `target/actual/scalingState/lastScaleAt/cooldown` по thresholds + cooldown.

## 6. Runtime metrics flow (`GET /admin/metrics`)

1. Endpoint находится в `RuntimeStatusController` и защищен `@Roles('Admin')`:
   [`runtime-status.controller.ts#L21`](../apps/report-api/src/runtime-status.controller.ts#L21).
2. `RuntimeMetricsService` формирует Prometheus text payload из:
   - queue counters (`ReportJobQueue.getJobCounts()`),
   - pool state snapshot (`WorkerPoolStateService.getSnapshot(...)`),
   - process memory gauges.

## 7. Bull-board admin flow (`/admin/queues` by default)

1. В `main.ts` после bootstrap вызывается `setupBullBoard(app)`:
   [`main.ts#L31`](../apps/report-api/src/main.ts#L31).
2. Setup регистрирует `createBullBoard(...)` с BullMQ queue adapter и Express router:
   [`bull-board.setup.ts`](../apps/report-api/src/bull-board.setup.ts).
3. Доступ к UI закрыт Basic Auth middleware (`BULL_BOARD_USERNAME`/`BULL_BOARD_PASSWORD`).

## 8. Public endpoints

Public routes:

- `GET /health`: [`health.controller.ts#L7`](../apps/report-api/src/health.controller.ts#L7)
- `POST /auth/dev-token`: [`auth.controller.ts#L24`](../apps/report-api/src/auth.controller.ts#L24)
- `POST /auth/refresh`: [`auth.controller.ts#L42`](../apps/report-api/src/auth.controller.ts#L42)
- `POST /auth/logout`: [`auth.controller.ts#L65`](../apps/report-api/src/auth.controller.ts#L65)

## 9. Runtime Notes

- `report-instance.worker.ts` и IPC `fork per request` больше не участвуют в основном launch flow.
- `REPORT_JOB_TIMEOUT_MS` сейчас читается в config, но в `queue.add(...)` не применяется напрямую (только `attempts/backoff/removeOn*`):
  [`report-queue.config.ts#L41`](../apps/report-api/src/report-queue.config.ts#L41),
  [`report-job.queue.ts#L23`](../apps/report-api/src/report-job.queue.ts#L23).
