# Worker Queue & Autoscaling Architecture

Документ фиксирует архитектуру выполнения отчетов через очередь BullMQ, выделенный worker-сервис и инфраструктурный автоскейлинг.

## Статус реализации (May 2026)

- Реализовано:
  - `report-api` создает `queued` instance и enqueue job в BullMQ.
  - выделенный `report-worker` процесс поднимается отдельно (`start:worker`) и исполняет jobs.
  - business status обновляется через `FileSystemReportInstanceStore` (`queued/running/completed/failed`).
- Еще не реализовано:
  - autoscaling policy (`WORKER_POOL_MIN/MID/MAX`, thresholds, cooldown),
  - `worker-pool status` endpoint/метрики,
  - bull-board integration.

## 1. Введение и цель

## Проблема исторического подхода

Изначально runtime запускал генерацию отчета через `fork per request` внутри `report-api` процесса.
Этот подход был заменен queue-based flow, так как при росте нагрузки возникали ограничения:

- API и execution конкурируют за одни и те же ресурсы процесса/контейнера.
- Нет полноценного orchestration слоя очереди (retry/backoff/stalled lifecycle на уровне системы очередей).
- Труднее управлять параллелизмом и динамическим масштабированием worker capacity.
- Ограниченная операционная наблюдаемость по состоянию execution-пула.

## Целевой результат

Переходим на модель:

- `report-api` отвечает за прием/валидацию launch, создание instance и постановку job в очередь.
- `report-worker` (отдельный процесс/сервис) исполняет jobs и обновляет progress/result/failure.
- BullMQ + Redis дают orchestration primitives (очередь, retries, stalled handling).
- Масштабирование worker capacity разделено на:
  - application-level policy (целевая емкость, thresholds, cooldown),
  - infrastructure-level scaling (KEDA/HPA/scheduler/resources).

Итог: стабильная обработка, наблюдаемый lifecycle задач, управляемый масштаб.

## 2. Инструменты и роли

- `BullMQ`
  - Очередь задач (`Queue`, `Worker`, `QueueScheduler`, `QueueEvents`).
  - Lifecycle job: waiting/active/completed/failed/delayed/stalled.
  - Retry политика (`attempts`, `backoff`), stalled detection, timeout integration.

- `Redis`
  - Backend хранения состояния очереди BullMQ и метаданных job execution.

- `report-api` (Nest)
  - Валидация launch input и проверка доступа.
  - Создание `reportInstance` в бизнес-сторе со статусом `queued`.
  - Enqueue job в BullMQ с `jobId = reportInstanceId`.
  - Отдача клиенту launch/status/result через текущие API.

- `report-worker` (выделенный сервис)
  - Получение jobs из BullMQ и выполнение report logic.
  - Обновление прогресса/stage и финального статуса (`completed/failed`) в instance store.

- `FileSystemReportInstanceStore` (текущий store)
  - Source of truth бизнес-статуса report instance для UI и API ответов.
  - Хранит `meta.json` + артефакт файла.

- `bull-board` (или аналог)
  - Админ-видимость сырого состояния очередей BullMQ и конкретных job attempts/errors.

- `KEDA`
  - Event-driven scaling по внешним метрикам очереди (Redis/BullMQ queue depth).

- `HPA`
  - Горизонтальное масштабирование worker deployment (обычно управляется KEDA).

- `Kubernetes scheduler` + `resources.requests/limits`
  - Фактическое ограничение по CPU/RAM и размещение pod’ов.

- `Cluster Autoscaler` (опционально)
  - Добавление/удаление нод кластера при нехватке/избытке ресурсов.

## 3. Статусы и их источник

Статусы разделяются на три слоя: бизнес-джоб, очередь, состояние worker-системы.

## 3.1 Job (бизнес-уровень, видит приложение)

Источник: `report instance store` (текущий `FileSystemReportInstanceStore`).

- `status`
  - `queued`
  - `running`
  - `completed`
  - `failed`

- `stage`
  - `queued`
  - `preparing`
  - `generating`
  - `storing-result`
  - `done`
  - `failed`

Кто обновляет:

- `report-api` при launch: создает `queued`.
- `report-worker` при обработке job:
  - `running` + progress/stage updates,
  - `completed` с artifact/result,
  - `failed` с `errorMessage`.

UI читает эти статусы через `GET /report-runs/:reportInstanceId`.

## 3.2 Queue/BullMQ (операционный уровень)

Источник: BullMQ queue state (Redis).

- `waiting`: job ждет worker slot.
- `active`: job выполняется worker’ом.
- `completed`: job завершен успешно (в queue storage).
- `failed`: job завершен ошибкой (после attempts).
- `delayed`: job отложен (например backoff/retry delay).
- `stalled`: job считался зависшим (worker heartbeat/lifecycle issue).

Это диагностические статусы execution-системы, не прямой бизнес-контракт UI.

## 3.3 Worker pool / system state

Источник: pool manager + инфраструктурные метрики.

- `targetWorkers`: целевой размер пула по policy.
- `actualWorkers`: фактически поднятые worker instances.
- `idleWorkers`: воркеры без активного job.
- `busyWorkers`: воркеры с активным job.
- `drainingWorkers`: воркеры в graceful stop/downscale.
- `scalingState`:
  - `stable`
  - `scaling_up`
  - `scaling_down`
  - `cooldown`
- `lastScaleAt`: timestamp последнего изменения target.
- `cooldownRemaining`: оставшееся время до следующего разрешенного scale action.

## 4. Динамики системы

## Нормальная нагрузка

- Базовый пул (например 5 workers).
- `waiting` близко к 0, jobs быстро переходят в `active`.
- `scalingState=stable`.

## Рост очереди

- При превышении порогов policy целевой размер увеличивается: `5 -> 10 -> 15`.
- Сначала растет `targetWorkers`, затем `actualWorkers`.
- В k8s фактический рост зависит от доступных ресурсов и scheduler placement.

## Спад очереди

- При снижении `waiting` ниже downscale thresholds:
  - `15 -> 10 -> 5`.
- Downscale выполняется только с cooldown (anti-flapping).
- Активные jobs не прерываются: воркер уходит в `draining` и закрывается после завершения текущей работы.

## Всплеск ошибок

- Рост `failed`/`stalled` в очереди.
- Увеличение latency из-за retries/backoff.
- Бизнес-слой видит больше instance со статусом `failed` и заполненным `errorMessage`.

## Нехватка ресурсов хоста/кластера

- Desired scale может расти, но часть pod’ов остается `Pending`.
- Реальный ceiling определяется `requests/limits`, доступными нодами и scheduler.
- При наличии Cluster Autoscaler capacity может расширяться автоматически.

## Истечение retries/timeout

- Если job превысил attempts или timeout:
  - BullMQ переводит job в failed lifecycle,
  - worker/adapter записывает business status `failed` в instance store,
  - UI получает `failed` + `errorMessage`.

## 5. Потоки управления (frontend/backend/worker)

## Launch flow

1. UI вызывает `POST /reports/:reportCode/launch`.
2. `report-api`:
   - валидирует reportCode/params/access,
   - создает `reportInstance` со статусом `queued`,
   - enqueue в BullMQ (`jobId=reportInstanceId`),
   - возвращает `{ reportInstanceId, status: 'queued' }`.
3. `report-worker` забирает job:
   - пишет `running` + stage/progress,
   - выполняет генерацию,
   - пишет `completed` + artifact или `failed`.
4. UI поллит `GET /report-runs/:reportInstanceId` до terminal status.

## Failure flow

1. Worker processor ловит error/timeout/retry-exhausted condition.
2. Бизнес-instance помечается `failed` с error reason.
3. UI видит terminal failed state через стандартный polling endpoint.

## Session/Auth flow

Не меняется этой архитектурой.
См. текущий документ: `docs/session-runtime-flow.md`.

## 6. Наблюдаемость и админ-доступ

## Через bull-board

Администратор может видеть:

- состояние очередей (`waiting/active/completed/failed/delayed`),
- карточки jobs, payload, stacktrace/errors,
- retry attempts и историю переходов жизненного цикла job.

## Через backend метрики/endpoint (рекомендуется)

Минимальный `worker-pool status` endpoint/метрики должны включать:

- queue counters,
- worker pool state (`target/actual/idle/busy/draining`),
- autoscaling state (`scalingState`, cooldown),
- error/stalled rates.

## Минимальный on-call checklist

1. Проверить queue backlog (`waiting`, `active`).
2. Проверить pool (`target` vs `actual`, `draining`, cooldown).
3. Проверить долю `failed/stalled` jobs.
4. Проверить ресурсный pressure (`CPU/RAM`, pending pods).
5. Проверить sample failed job stacktrace и конкретные instance `errorMessage`.

## 7. Конфигурация и v1 policy

## Рекомендуемые env

- Queue
  - `REPORT_QUEUE_NAME`
  - `REPORT_QUEUE_PREFIX` (optional)

- Job execution policy
  - `REPORT_JOB_ATTEMPTS`
  - `REPORT_JOB_BACKOFF_MS`
  - `REPORT_JOB_TIMEOUT_MS`
  - `REPORT_JOB_REMOVE_ON_COMPLETE`
  - `REPORT_JOB_REMOVE_ON_FAIL`

Примечание: `REPORT_JOB_TIMEOUT_MS` уже присутствует в config, но в текущей реализации `queue.add(...)` еще не использует timeout как `jobs option`.

- Worker pool sizing
  - `WORKER_POOL_MIN=5`
  - `WORKER_POOL_MID=10`
  - `WORKER_POOL_MAX=15`

- Scale thresholds
  - `WORKER_SCALE_UP_TO_MID_WAITING_THRESHOLD`
  - `WORKER_SCALE_UP_TO_MAX_WAITING_THRESHOLD`
  - `WORKER_SCALE_DOWN_TO_MID_WAITING_THRESHOLD`
  - `WORKER_SCALE_DOWN_TO_MIN_WAITING_THRESHOLD`
  - `WORKER_SCALE_COOLDOWN_MS`

- Redis
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `REDIS_PASSWORD` (if needed)
  - `REDIS_DB` (optional)

## Policy for v1 (зафиксировать)

- Ступенчатый scaling по queue depth:
  - `5 -> 10 -> 15` при росте waiting backlog,
  - `15 -> 10 -> 5` при спаде,
  - с обязательным cooldown для анти-флаппинга.

## 8. Test/Acceptance DoD

Реализация считается готовой, если подтверждены сценарии:

1. `launch -> queued -> running -> completed`.
2. Failure path:
   - worker exception,
   - timeout,
   - retries exhausted,
   - итог: бизнес-status `failed` + error message.
3. Autoscaling:
   - scale up/down по порогам,
   - cooldown соблюдается,
   - активные jobs не теряются при downscale (graceful drain).
4. Resource pressure:
   - desired replicas может превышать schedulable,
   - система остается наблюдаемой, queue не теряет jobs.
5. Visibility:
   - UI корректно видит business statuses,
   - admin видит queue/pool состояние через bull-board и/или endpoint.

## 9. Assumptions

- BullMQ + Redis остаются основным orchestration слоем.
- Worker-сервис выделяется отдельно от `report-api` процесса.
- Kubernetes/KEDA/HPA — целевой production-контур.
- Документ применим и к локальному dev-режиму без k8s:
  - queue+worker работают локально,
  - autoscaling policy можно запускать process-level менеджером.
