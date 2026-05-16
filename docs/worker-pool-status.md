# Worker Pool Status

Документ описывает admin endpoint статуса очереди/воркеров и контракт ответа.

## 1. Назначение

`GET /admin/worker-pool/status` — операционный endpoint для наблюдаемости runtime слоя.

Он нужен для:

- понимания текущего backlog в очереди;
- оценки загрузки worker-пула;
- отображения состояния autoscaling-policy.

Это не business endpoint для пользовательского UI-флоу запуска отчета.

## 2. Где в коде

- Контроллер: [`apps/report-api/src/runtime-status.controller.ts`](../apps/report-api/src/runtime-status.controller.ts)
- Сервис агрегации: [`apps/report-api/src/modules/runtime-status/services/worker-pool-status.service.ts`](../apps/report-api/src/modules/runtime-status/services/worker-pool-status.service.ts)
- Контракт: [`libs/report-platform/contracts/src/worker-pool-status.contract.ts`](../libs/report-platform/contracts/src/worker-pool-status.contract.ts)
- Queue counters: [`apps/report-api/src/report-job.queue.ts`](../apps/report-api/src/report-job.queue.ts)

## 3. Доступ

Endpoint защищен role-check через `@Roles('Admin')`.

## 4. Контракт ответа

Контракт задается `WorkerPoolStatusSchema`:

```ts
export const WorkerPoolStatusSchema = z.object({
  queueCounters: z.object({
    waiting: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    delayed: z.number().int().nonnegative(),
  }),
  pool: z.object({
    targetWorkers: z.number().int().nonnegative(),
    actualWorkers: z.number().int().nonnegative(),
    idleWorkers: z.number().int().nonnegative(),
    busyWorkers: z.number().int().nonnegative(),
    drainingWorkers: z.number().int().nonnegative(),
  }),
  autoscaling: z.object({
    scalingState: WorkerPoolScalingStateSchema,
    lastScaleAt: z.string().datetime().nullable(),
    cooldownRemainingMs: z.number().int().nonnegative(),
  }),
});
```

### 4.1 `queueCounters`

Данные из BullMQ queue состояния:

- `waiting`: jobs, ожидающие воркер.
- `active`: jobs, которые сейчас выполняются.
- `completed`: успешно завершенные jobs.
- `failed`: jobs, завершенные ошибкой.
- `delayed`: отложенные jobs (например, retry/backoff delay).

### 4.2 `pool`

Логическая модель worker-пула:

- `targetWorkers`: целевое количество воркеров по policy.
- `actualWorkers`: фактическое число активных воркеров.
- `idleWorkers`: воркеры без текущего job.
- `busyWorkers`: воркеры с активным job.
- `drainingWorkers`: воркеры в graceful stop/downscale.

### 4.3 `autoscaling`

Состояние автомасштабирования:

- `scalingState`: enum
  - `stable`
  - `scaling_up`
  - `scaling_down`
  - `cooldown`
- `lastScaleAt`: ISO datetime timestamp последнего scale action или `null`.
- `cooldownRemainingMs`: оставшееся время cooldown в миллисекундах.

## 5. Пример ответа

```json
{
  "queueCounters": {
    "waiting": 0,
    "active": 1,
    "completed": 42,
    "failed": 2,
    "delayed": 0
  },
  "pool": {
    "targetWorkers": 5,
    "actualWorkers": 5,
    "idleWorkers": 4,
    "busyWorkers": 1,
    "drainingWorkers": 0
  },
  "autoscaling": {
    "scalingState": "stable",
    "lastScaleAt": null,
    "cooldownRemainingMs": 0
  }
}
```

## 6. Текущий статус реализации

На текущем шаге часть полей `pool/autoscaling` является базовой runtime-моделью до внедрения полного autoscaling controller:

- `targetWorkers` сейчас берется из `WORKER_POOL_MIN` (fallback `1`);
- `actualWorkers` приравнен к `targetWorkers`;
- `drainingWorkers` фиксирован в `0`;
- `lastScaleAt` пока `null`.

Это ожидаемо на этапе внедрения status endpoint; полноценная динамика будет добавлена в шаге autoscaling policy.

## 7. Связанные следующие шаги

1. Реализовать application-level autoscaling policy (`thresholds + cooldown`).
2. Вынести живой state manager для `target/actual/scalingState/lastScaleAt`.
3. Добавить metrics endpoint и интеграцию с monitoring/alerts.
4. Подключить bull-board для админ-наблюдаемости jobs/errors/retries.
