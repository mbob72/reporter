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
- Metrics exporter: [`apps/report-api/src/modules/runtime-status/services/runtime-metrics.service.ts`](../apps/report-api/src/modules/runtime-status/services/runtime-metrics.service.ts)
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

Реализованы:

- живой state manager (`WorkerPoolStateService`) для:
  - `targetWorkers`
  - `actualWorkers`
  - `scalingState`
  - `lastScaleAt`
  - `cooldownUntilMs`
- application-level autoscaling policy (`WorkerAutoscalingPolicyService`):
  - thresholds `min/mid/max`,
  - `scale up/down` по `waiting backlog`,
  - cooldown anti-flapping,
  - периодическая переоценка (`WORKER_SCALE_EVALUATION_INTERVAL_MS`).

Технические детали текущей модели:

- `drainingWorkers` пока фиксирован в `0` (graceful drain lifecycle будет расширен отдельно).
- `actualWorkers` в текущем варианте моделируется в приложении (reconcile к `targetWorkers`) и не отражает k8s pod state напрямую.
- `cooldownRemainingMs` вычисляется из `cooldownUntilMs - now`.

## 7. Связанные следующие шаги

Реализовано дополнительно:

1. `GET /admin/metrics` (Prometheus text format) для queue/pool/process метрик.
2. bull-board подключен в API runtime и доступен по `BULL_BOARD_BASE_PATH` (по умолчанию `/admin/queues`), защищен Basic Auth (`BULL_BOARD_USERNAME`/`BULL_BOARD_PASSWORD`).

Актуальные следующие шаги:

1. Интегрировать scraping/alerts policy (Prometheus/Grafana/Alertmanager) в окружения.
2. Добавить отдельные rate-метрики `failed/stalled` и latency histograms.
3. Расширить модель `actual/draining` до инфраструктурно-истинной (учет реальных worker instances/pods).
