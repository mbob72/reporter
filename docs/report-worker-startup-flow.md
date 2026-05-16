# Report Worker Startup Flow

Актуальная цепочка запуска worker-процесса после перехода на `BullMQ + Nest ApplicationContext`.

## 1. Launch инициируется из API

1. HTTP launch приходит в `POST /reports/:reportCode/launch`:
   [`reports.controller.ts#L74`](../apps/report-api/src/reports.controller.ts#L74).
2. `ReportsLaunchService` валидирует доступ/params и вызывает runner:
   [`reports-launch.service.ts#L20`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L20),
   [`reports-launch.service.ts#L31`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L31),
   [`reports-launch.service.ts#L38`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L38),
   [`reports-launch.service.ts#L47`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L47).
3. Runner создает queued instance и enqueue job в BullMQ:
   [`report-instance.runner.ts#L44`](../apps/report-api/src/report-instance.runner.ts#L44),
   [`report-instance.runner.ts#L49`](../apps/report-api/src/report-instance.runner.ts#L49).

## 2. Queue provider и модульность

1. Queue provider выделен в `ReportQueueModule`:
   [`report-queue.module.ts#L6`](../apps/report-api/src/modules/report-queue.module.ts#L6).
2. Orchestration импортирует queue module и собирает runner через токены:
   [`report-orchestration.module.ts#L19`](../apps/report-api/src/modules/report-orchestration.module.ts#L19),
   [`report-orchestration.module.ts#L22`](../apps/report-api/src/modules/report-orchestration.module.ts#L22).
3. BullMQ `Queue.add(...)` конфигурируется в `ReportJobQueue`:
   [`report-job.queue.ts#L11`](../apps/report-api/src/report-job.queue.ts#L11),
   [`report-job.queue.ts#L23`](../apps/report-api/src/report-job.queue.ts#L23).

## 3. Entrypoint выделенного worker

1. Worker запускается отдельной командой `pnpm start:worker` -> `report-worker.main.ts`.
2. Entrypoint поднимает `WorkerAppModule` через `createApplicationContext`:
   [`report-worker.main.ts#L9`](../apps/report-api/src/report-worker.main.ts#L9),
   [`worker-app.module.ts#L8`](../apps/report-api/src/modules/worker-app.module.ts#L8).
3. Из контекста берется `ReportWorkerRuntimeService` и стартует BullMQ worker:
   [`report-worker.main.ts#L12`](../apps/report-api/src/report-worker.main.ts#L12),
   [`report-worker-runtime.service.ts#L14`](../apps/report-api/src/modules/report-worker/services/report-worker-runtime.service.ts#L14).

## 4. Обработка job

1. `ReportWorkerRuntimeService` создает `Worker<ReportJobPayload>` и подписки на `completed/failed`:
   [`report-worker-runtime.service.ts#L19`](../apps/report-api/src/modules/report-worker/services/report-worker-runtime.service.ts#L19),
   [`report-worker-runtime.service.ts#L35`](../apps/report-api/src/modules/report-worker/services/report-worker-runtime.service.ts#L35),
   [`report-worker-runtime.service.ts#L39`](../apps/report-api/src/modules/report-worker/services/report-worker-runtime.service.ts#L39).
2. На входе каждого job вызывается `ReportJobProcessor.process(job)`:
   [`report-worker-runtime.service.ts#L22`](../apps/report-api/src/modules/report-worker/services/report-worker-runtime.service.ts#L22),
   [`report-job.processor.ts#L36`](../apps/report-api/src/report-job.processor.ts#L36).
3. Processor вызывает executor (`reportDefinition.launch(...)`), пишет progress, сохраняет артефакт и финальный статус:
   [`report-job.processor.ts#L42`](../apps/report-api/src/report-job.processor.ts#L42),
   [`report-launch.executor.ts#L43`](../apps/report-api/src/report-launch.executor.ts#L43),
   [`report-job.processor.ts#L56`](../apps/report-api/src/report-job.processor.ts#L56),
   [`report-job.processor.ts#L72`](../apps/report-api/src/report-job.processor.ts#L72).
4. На error path processor выставляет `failed` и пробрасывает exception в BullMQ:
   [`report-job.processor.ts#L74`](../apps/report-api/src/report-job.processor.ts#L74).

## 5. Graceful shutdown

- `report-worker.main.ts` ловит `SIGINT/SIGTERM` и закрывает `ApplicationContext`:
  [`report-worker.main.ts#L15`](../apps/report-api/src/report-worker.main.ts#L15).
- `ReportWorkerRuntimeService.onModuleDestroy()` закрывает BullMQ worker:
  [`report-worker-runtime.service.ts#L53`](../apps/report-api/src/modules/report-worker/services/report-worker-runtime.service.ts#L53).

## 6. Что устарело

- IPC/fork startup chain через `report-instance.worker.ts` устарел для текущего runtime-пути.
- Актуальный production/dev путь: `report-api` enqueue + отдельный `start:worker` процесс.
