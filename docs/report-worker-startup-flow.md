# Где Запускается Воркер

Короткая цепочка запуска worker-процесса в `report-api`.

## 1. Вход через launch endpoint

HTTP запуск отчета приходит в `POST /reports/:reportCode/launch`:
[`reports.controller.ts#L194`](../apps/report-api/src/reports.controller.ts#L194).

После валидации controller передает задачу в раннер:
[`reports.controller.ts#L245`](../apps/report-api/src/reports.controller.ts#L245).

## 2. Старт раннера и fork процесса

Раннер готовит `workerStartMessage` и вызывает `startWorker(...)`:
[`report-instance.runner.ts#L147`](../apps/report-api/src/report-instance.runner.ts#L147),
[`report-instance.runner.ts#L161`](../apps/report-api/src/report-instance.runner.ts#L161).

Фактический запуск отдельного процесса выполняется через `child_process.fork(...)`:
[`report-instance.runner.ts#L200`](../apps/report-api/src/report-instance.runner.ts#L200),
[`report-instance.runner.ts#L202`](../apps/report-api/src/report-instance.runner.ts#L202).

## 3. Entrypoint воркера

В `report-instance.worker.ts` процесс ждет IPC-сообщение от parent:
[`report-instance.worker.ts#L86`](../apps/report-api/src/report-instance.worker.ts#L86).

После получения `type: 'start'` вызывается `run(...)`, создается registry и запускается выполнение:
[`report-instance.worker.ts#L37`](../apps/report-api/src/report-instance.worker.ts#L37),
[`report-instance.worker.ts#L43`](../apps/report-api/src/report-instance.worker.ts#L43),
[`report-instance.worker.ts#L47`](../apps/report-api/src/report-instance.worker.ts#L47).

## 4. Где реально вызывается report definition

Воркер вызывает `executeReportLaunchInWorker(...)`, где из registry берется definition и выполняется `reportDefinition.launch(...)`:
[`report-launch.executor.ts#L24`](../apps/report-api/src/report-launch.executor.ts#L24),
[`report-launch.executor.ts#L43`](../apps/report-api/src/report-launch.executor.ts#L43).
