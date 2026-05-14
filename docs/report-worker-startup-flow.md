# Report Worker Startup Flow

Короткая цепочка запуска worker-процесса в `report-api`.

## 1. Вход через launch endpoint

HTTP запуск отчета приходит в `POST /reports/:reportCode/launch`:
[`reports.controller.ts#L74`](../apps/report-api/src/reports.controller.ts#L74).

Controller (после route-level валидации через `ZodValidationPipe`) делегирует в `ReportsLaunchService`:
[`reports.controller.ts#L77`](../apps/report-api/src/reports.controller.ts#L77),
[`reports.controller.ts#L83`](../apps/report-api/src/reports.controller.ts#L83),
[`reports-launch.service.ts#L19`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L19).

В `ReportsLaunchService` выполняются domain checks (report exists, role access, launch params schema) и старт раннера:
[`reports-launch.service.ts#L20`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L20),
[`reports-launch.service.ts#L31`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L31),
[`reports-launch.service.ts#L38`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L38),
[`reports-launch.service.ts#L47`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L47).

## 2. Старт раннера и fork процесса

Раннер создает `workerStartMessage`, пишет queued instance и инициирует worker:
[`report-instance.runner.ts#L145`](../apps/report-api/src/report-instance.runner.ts#L145),
[`report-instance.runner.ts#L155`](../apps/report-api/src/report-instance.runner.ts#L155),
[`report-instance.runner.ts#L161`](../apps/report-api/src/report-instance.runner.ts#L161).

Фактический запуск отдельного процесса выполняется через `child_process.fork(...)`:
[`report-instance.runner.ts#L203`](../apps/report-api/src/report-instance.runner.ts#L203),
[`report-instance.runner.ts#L205`](../apps/report-api/src/report-instance.runner.ts#L205).

## 3. Entrypoint воркера

В `report-instance.worker.ts` процесс принимает IPC-сообщение и запускает `run(...)`:
[`report-instance.worker.ts#L86`](../apps/report-api/src/report-instance.worker.ts#L86),
[`report-instance.worker.ts#L37`](../apps/report-api/src/report-instance.worker.ts#L37).

Внутри `run(...)` создается registry и запускается executor:
[`report-instance.worker.ts#L43`](../apps/report-api/src/report-instance.worker.ts#L43),
[`report-instance.worker.ts#L47`](../apps/report-api/src/report-instance.worker.ts#L47).

## 4. Где реально вызывается report definition

Воркер вызывает `executeReportLaunchInWorker(...)`, где из registry берется definition и выполняется `reportDefinition.launch(...)`:
[`report-launch.executor.ts#L21`](../apps/report-api/src/report-launch.executor.ts#L21),
[`report-launch.executor.ts#L24`](../apps/report-api/src/report-launch.executor.ts#L24),
[`report-launch.executor.ts#L43`](../apps/report-api/src/report-launch.executor.ts#L43).
