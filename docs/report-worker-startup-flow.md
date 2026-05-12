# Report Worker Startup Flow

Короткая цепочка запуска worker-процесса в `report-api`.

## 1. Вход через launch endpoint

HTTP запуск отчета приходит в `POST /reports/:reportCode/launch`:
[`reports.controller.ts#L88`](../apps/report-api/src/reports.controller.ts#L88).

Controller делегирует в `ReportsLaunchService`:
[`reports.controller.ts#L96`](../apps/report-api/src/reports.controller.ts#L96),
[`reports-launch.service.ts#L24`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L24).

В `ReportsLaunchService` выполняются schema/access проверки и старт раннера:
[`reports-launch.service.ts#L25`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L25),
[`reports-launch.service.ts#L46`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L46),
[`reports-launch.service.ts#L53`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L53),
[`reports-launch.service.ts#L65`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L65).

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
