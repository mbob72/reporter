# Report Platform: Backend README

Этот README описывает backend-подходы в текущей реализации, чтобы ревьюеру было проще быстро проверить соответствие задания и понять архитектурные решения.

## Dev инфраструктура (первый шаг)

### Запуск через Docker Compose (dev)

1. Установить зависимости на хосте:

```bash
pnpm install
```

2. Поднять локальное окружение:

```bash
docker compose -f docker-compose.dev.yml up --build
```

После старта доступны сервисы:

- web: `http://localhost:4200`
- api: `http://localhost:3000`
- redis: `localhost:6379`

Redis добавлен в dev compose заранее как подготовка к будущему BullMQ workflow. На текущем шаге код приложения может его не использовать напрямую.

### Локальный запуск без Docker

```bash
pnpm install
pnpm start:api
pnpm start:web
```

По умолчанию:

- API слушает `0.0.0.0:3000` (доступен как `http://localhost:3000`)
- Web dev server слушает `0.0.0.0:4200` (доступен как `http://localhost:4200`)
- Vite proxy target по умолчанию: `http://127.0.0.1:3000`

Для Docker-сценария прокси web на API переключается через `VITE_PROXY_TARGET=http://api:3000`.

### Quality-check команды (root)

- `pnpm lint` — запускает ESLint для `apps` и `libs`, проверяет стиль и базовые ошибки.
- `pnpm lint:fix` — то же, но с автоисправлением безопасных lint-проблем.
- `pnpm format` — форматирует измененные Nx-файлы через Prettier (`nx format:write`).
- `pnpm format:check` — проверяет форматирование без изменений (`nx format:check`).
- `pnpm typecheck` — проверяет TypeScript-типы для `report-api` и `report-web` без сборки.
- `pnpm build` — собирает `report-api` (tsc) и `report-web` (vite build).
- `pnpm test` — запускает тесты `report-web` (Vitest).
- `pnpm validate` — полный локальный quality gate: `format:check + lint + typecheck + test + build`.

Дополнительно для Docker-режима:

- `pnpm dev:docker` — поднимает локальное dev-окружение (`api + web + redis`) через Docker Compose с пересборкой.
- `pnpm dev:docker:attach` — поднимает окружение в фоне и сразу подключает live-логи (удобный режим “запустил и смотришь”).
- `pnpm dev:docker:down` — останавливает и удаляет контейнеры dev-compose.
- `pnpm dev:docker:logs` — показывает live-логи всех сервисов dev-compose.

Рекомендуемый быстрый цикл перед коммитом:

1. `pnpm lint:fix`
2. `pnpm format`
3. `pnpm validate`

## 0. Верхнеуровневый сценарий (как формируется отчет)

Текущий backend ориентирован на генерацию XLSX-отчетов на базе шаблонов.

Базовый pipeline:

1. Берется XLSX-шаблон из `libs/report-definitions/*/template-assets/*.xlsx`.
2. Создается рабочая копия шаблона (временный файл) и в нее подставляются исходные данные.
3. Для корректного пересчета формул/деривативов файл прогоняется через LibreOffice (`soffice --headless --convert-to xlsx`).
4. Пересчитанный XLSX читается обратно и отдается как итоговый `BuiltFile`.
5. Результат запуска сохраняется в файловой системе (`.generated-reports/{reportCode}/{reportInstanceId}`):
   - `meta.json` — состояние экземпляра отчета,
   - `artifact.bin` — бинарник итогового файла.

Важно для ревью:

- Хранилище данных в проекте сейчас mock-ориентированное (репозитории из `@report-platform/data-access`), без реальной БД.
- При этом доступ к данным не «плоский»: учитывается scope пользователя (`role`, `tenantId`, `organizationId`), и репозитории/контроллеры проверяют tenant access.
- То есть база замокана, но правила авторизации и tenant-ограничений в runtime соблюдаются.

Быстрые ссылки в коде:

- [XLSX runtime (`fillTemplateWorkbook`, `resolveLibreOfficeBinary`)](libs/report-platform/xlsx/src/template-runtime.ts)
- [Definition отчета (`createSimpleSalesSummaryXlsxDefinition`)](libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.definition.ts)
- [Шаблонные операции (`fillProductsSheet`, `fillChannelsSheet`, `fillCrossJoinSheet`, `readCrossJoinRows`)](libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.template.ts)
- [Источник данных для XLSX (`SimpleSalesSummaryXlsxSourceService`)](libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.source.ts)
- [Проверка tenant scope (`canAccessTenantData`)](libs/report-platform/auth/src/access.helper.ts)
- [Mock-репозитории с учетом scope (`MockTenantRepository`, `MockSalesRepository`)](libs/report-platform/data-access/src/tenant.repository.mock.ts)
- [Launch orchestration (`ReportInstanceRunner.start`)](apps/report-api/src/report-instance.runner.ts)
- [FS store (`createQueuedInstance`, `saveArtifact`, `listByReportCode`)](apps/report-api/src/report-instance.store.ts)
- [HTTP endpoints (`ReportsController`)](apps/report-api/src/reports.controller.ts)

## 1. Что реализовано по заданию

- Введена каноническая сущность `report instance` (вместо старого `report job`).
- `reportInstanceId` создается сразу при `launch` и возвращается в ответе `POST /reports/:reportCode/launch`.
- Один запуск = один `reportInstanceId`, который живет независимо от результата (`completed` и `failed` одинаково валидны для чтения).
- Добавлен endpoint восстановления состояния запуска: `GET /report-runs/:reportInstanceId`.
- Добавлен endpoint истории запусков по коду отчета: `GET /reports/:reportCode/instances`.
- Генерируемые файлы и метаданные запуска сохранены в файловой системе проекта в `.generated-reports`.
- Сохранен download flow через `GET /generated-files/:fileId`.
- Старый `report-job` flow удален из backend.

## 2. Архитектурные принципы backend

### 2.1 Canonical launch identity

Ключевая идея: backend опирается на `reportInstanceId` как на единственный идентификатор запуска.

Это дает:

- стабильный id для прогресса, результата, истории и скачивания,
- возможность восстановить состояние запуска после reload/direct open,
- отсутствие конкурирующих идентификаторов (`jobId` vs `instanceId`).

### 2.2 Async execution без усложнения инфраструктуры

Исполнение сделано через `child_process.fork` (worker-процесс), без отдельной очереди/брокера.

- API отвечает быстро (`accepted`),
- тяжелая генерация файла идет асинхронно в worker,
- прогресс и финальный результат передаются IPC-сообщениями.

Это соответствует требованию «не over-engineer очередь/инфраструктуру».

### 2.3 File-system backed persistence

Состояние экземпляра и артефакт не хранятся в памяти контроллера:

- `meta.json` содержит состояние instance,
- `artifact.bin` содержит результат генерации,
- данные переживают перезапуск процесса API.

### 2.4 Contract-first и runtime validation

Контракты определены в `libs/report-platform/contracts` на `zod`.

В API используется:

- валидация входа (`LaunchReportBodySchema`),
- валидация ответов (`ReportLaunchAcceptedSchema`, `ReportInstanceSchema`, `ReportInstanceListResponseSchema`).

Это помогает ловить рассинхрон frontend/backend на уровне runtime.

### 2.5 Явное управление ошибками

`toHttpException` мапит доменные ошибки в HTTP:

- `VALIDATION_ERROR` -> `400`
- `FORBIDDEN` -> `403`
- `NOT_FOUND` -> `404`
- прочее -> `500`

## 3. Модель Report Instance

Источник: `apps/report-api/src/report-instance.types.ts`, `libs/report-platform/contracts/src/report-instance.contract.ts`.

Поля экземпляра:

- `id`
- `reportCode`
- `status`: `queued | running | completed | failed`
- `stage`: `queued | preparing | generating | storing-result | done | failed`
- `progressPercent` (0..100)
- `createdAt`, `startedAt?`, `finishedAt?`
- `result?`
- `errorMessage?`
- `artifactId?`, `fileName?`, `mimeType?`, `byteLength?`

### Инварианты

- Терминальные статусы (`completed`, `failed`) больше не обновляются.
- Для `completed` сохраняются result и linkage к артефакту.
- Для `failed` сохраняется причина ошибки (`errorMessage`).

## 4. Lifecycle запуска

1. `POST /reports/:reportCode/launch`
2. Backend валидирует payload и права.
3. Создается `reportInstanceId`.
4. В store пишется queued-instance (`createQueuedInstance`).
5. API сразу возвращает `{ reportInstanceId, status: 'queued' }`.
6. Worker отправляет progress (`preparing`/`generating`).
7. Parent обновляет состояние (`markRunning`, `updateProgress`).
8. По завершению:
   - файл сохраняется в fs (`saveArtifact`),
   - instance закрывается как `completed` (`markCompleted`).
9. При любой ошибке instance закрывается как `failed` (`markFailed`).

## 5. Файловое хранилище

Корневой каталог:

- `<repo-root>/.generated-reports`

Структура:

```txt
.generated-reports/
  {reportCode}/
    {reportInstanceId}/
      meta.json
      artifact.bin
```

В `.gitignore` добавлено:

- `.generated-reports`

### Как обеспечена консистентность

Реализация в `FileSystemReportInstanceStore`:

- per-instance lock (`withInstanceLock`) сериализует операции по одному instance,
- `meta.json` пишется атомарно через временный файл + `rename`,
- есть кэш `reportCodeByInstanceId` для ускорения lookup,
- fallback-поиск по директориям работает для recovery после рестарта.

## 6. API (runtime)

### Launch и справочники

- `GET /reports`
- `GET /reports/:code/metadata`
- `GET /reports/:reportCode/external-services/:serviceKey/shared-settings`
- `GET /tenants`
- `GET /tenants/:tenantId/organizations`
- `POST /reports/:reportCode/launch`

### Report instances

- `GET /report-runs/:reportInstanceId` — текущее состояние конкретного запуска
- `GET /reports/:reportCode/instances` — история запусков по report code

### Download

- `GET /generated-files/:fileId`

## 7. Где смотреть код (карта для ревью)

- `apps/report-api/src/reports.controller.ts`
  - launch, metadata, shared settings, tenants/orgs, instances listing, download
- `apps/report-api/src/report-runs.controller.ts`
  - чтение состояния instance по id
- `apps/report-api/src/report-instance.runner.ts`
  - создание instance id, orchestration worker lifecycle
- `apps/report-api/src/report-instance.worker.ts`
  - выполнение отчета в дочернем процессе
- `apps/report-api/src/report-instance.store.ts`
  - fs-backed store, метаданные, артефакты, list/get/update
- `apps/report-api/src/report-launch.executor.ts`
  - бизнес-исполнение launch в worker + progress callbacks
- `libs/report-platform/contracts/src/report-instance.contract.ts`
  - shared contract для `reportInstanceId` и статусов

## 8. Сопоставление с требованиями задания

- `reportInstanceId` создается сразу: `ReportInstanceRunner.start()`
- instance существует при успехе и при падении: `markCompleted` / `markFailed`
- endpoint восстановления по id: `GET /report-runs/:reportInstanceId`
- история по report code: `GET /reports/:reportCode/instances`
- файловое хранение в проекте: `FileSystemReportInstanceStore` + `.generated-reports`
- без новой БД: используется fs store
- без внешней очереди: worker через `fork`

## 9. Локальный запуск

```bash
pnpm start:api
pnpm start:web
```

По умолчанию:

- API: `http://localhost:3000`
- Web: `http://localhost:4200`

Проверка руками (пример):

1. Запустить launch (`POST /reports/:reportCode/launch`) и убедиться, что ответ сразу содержит `reportInstanceId`.
2. Прочитать `GET /report-runs/:reportInstanceId` до terminal state.
3. Проверить появление файлов в `.generated-reports/{reportCode}/{reportInstanceId}`.
4. Проверить `GET /reports/:reportCode/instances`.
5. Для completed instance проверить download по `GET /generated-files/:fileId`.

## 10. Ограничения текущего решения

- В проекте используется mock auth/header (`x-mock-user`) для локального и demo-сценария.
- Worker orchestration выполнен в рамках одного API-инстанса (без distributed queue).
- Контроллер download отдает файл из локального filesystem текущего окружения.

Для production это обычно расширяют до:

- реальной auth/session модели,
- object storage (S3/MinIO),
- фонового процессинга с устойчивой очередью и retry-policy.

## 11. Frontend: основной сценарий launcher + stepper

Этот раздел описывает фронтовый пользовательский поток и дает ревьюеру карту ключевых файлов.

### 11.1 Router и URL как источник состояния шага

Маршруты сценария:

- `/report-launch` — шаг 1 (выбор отчета)
- `/report-launch/configure` — шаг 2 (конфигурация запуска)
- `/report-runs/:reportInstanceId` — шаг 3 (прогресс)
- `/report-runs/:reportInstanceId/result` — шаг 4 (результат)

Код:

- [Router definitions (`appRoutes`)](apps/report-web/src/app/router/router.tsx)
- [Stepper shell + active step от pathname](apps/report-web/src/features/report-launcher-runtime/containers/ReportLaunchShell.tsx)

### 11.2 Шаг 1: выбор типа отчета + ready instances

Что делает шаг:

- Загружает список типов отчетов (`GET /reports`).
- Для выбранного `reportCode` загружает историю запусков (`GET /reports/:reportCode/instances`).
- Показывает:
  - список report types (с поиском и role-based availability),
  - список готовых инстансов выбранного отчета (ready instances) с download links при наличии прав.
- При недостаточных правах показывает только count готовых инстансов без ссылок.
- Переход на шаг 2 доступен только когда выбран доступный отчет.

Код:

- [Step1 container (data mapping + access gating)](apps/report-web/src/features/report-launcher-runtime/containers/Step1ReportSelectionContainer.tsx)
- [Step1 UI card (reports + ready instances)](apps/report-web/src/features/report-launcher-story/components/Step1ReportSelectionCard.tsx)
- [RTK Query API endpoints](apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts)
- [Role check helper](apps/report-web/src/features/report-launcher-runtime/lib/access.ts)

### 11.3 Шаг 2: специфичная конфигурация запуска для каждого отчета

Что делает шаг:

- Строит launch-модель на основе выбранного отчета, metadata и runtime state.
- Поддерживает report-specific UX: общий каркас одинаковый, но содержимое блоков может отличаться по `reportCode`.
- Поля credentials отображаются только если у отчета есть `externalDependency`.
- По submit формирует `launch params`, сохраняет launch snapshot в store и вызывает `POST /reports/:reportCode/launch`.
- После успешного launch делает переход на шаг 3: `/report-runs/:reportInstanceId`.

Код:

- [Step2 container (hooks composition)](apps/report-web/src/features/report-launcher-runtime/containers/Step2LaunchConfigurationContainer.tsx)
- [Step2 view model (constraints, fields, credentials)](apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2LaunchConfigurationViewModel.ts)
- [Step2 actions (launch submit + navigation)](apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2LaunchActions.ts)
- [Step2 UI card (`renderReportSpecificBlocks`)](apps/report-web/src/features/report-launcher-story/components/Step2LaunchConfigurationCard.tsx)

### 11.4 Шаг 3: прогресс выполнения

Что делает шаг:

- Пуллит `GET /report-runs/:reportInstanceId` (интервал 1s).
- Маппит backend-статус/стейдж в UI timeline и diagnostics.
- При `completed` автоматически переводит на `/report-runs/:reportInstanceId/result`.

Код:

- [Step3 container (polling + redirect)](apps/report-web/src/features/report-launcher-runtime/containers/Step3RunProgressContainer.tsx)
- [Step3 UI card](apps/report-web/src/features/report-launcher-story/components/Step3RunProgressCard.tsx)

### 11.5 Шаг 4: результат + история ранее сгенерированных

Что делает шаг:

- Загружает текущий instance и строит primary artifact.
- Загружает список запусков того же `reportCode` и показывает recent artifacts.
- Обрабатывает прямое открытие `/result`: если запуск не завершен, редиректит на шаг прогресса.

Код:

- [Step4 container (result model + guards)](apps/report-web/src/features/report-launcher-runtime/containers/Step4ResultContainer.tsx)
- [Step4 UI card](apps/report-web/src/features/report-launcher-story/components/Step4ResultCard.tsx)

### 11.6 Общие UI/state точки для ревью

- [Shared footer actions (Back/Launch/Run again и т.п.)](apps/report-web/src/features/report-launcher-story/components/StepFooterActions.tsx)
- [Launcher slice (selected report/context/credentials/snapshot)](apps/report-web/src/features/report-launcher-runtime/store/launcherSlice.ts)
- [Session slice (mock user)](apps/report-web/src/features/report-launcher-runtime/store/sessionSlice.ts)
