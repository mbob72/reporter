# ARCHITECTURE.md

## Статус документа

- Этот файл является каноническим описанием архитектуры.
- Изменения в коде, влияющие на архитектуру и контракты, должны сопровождаться обновлением этого файла.
- Текущая версия отражает состояние репозитория на `2026-04-29`.
- Архитектурное описание централизовано здесь, чтобы избежать дублирования и расхождения документов.

## Legacy-термины (миграция API)

- `jobId` заменен на `reportInstanceId`.
- `GET /report-jobs/:jobId` заменен на `GET /report-runs/:reportInstanceId`.
- In-memory job store заменен на filesystem-backed instance store (`meta.json` + `artifact.bin`).

## 1. Архитектура: компоненты, потоки данных, границы ответственности

### 1.1 Цель платформы

Платформа предназначена для безопасного запуска отчетов в multi-tenant окружении с асинхронной генерацией артефактов (сейчас в формате XLSX) и контролируемым доступом к данным.

### 1.2 Контекст исполнения

Целевой принцип (документированный как архитектурное требование):

```ts
type ReportExecutionContext = {
  initiator: {
    userId: string;
    role: Role;
    tenantId: string;
  };
  accessScope: {
    tenantIds: string[];
    mode: 'tenant' | 'global';
  };
  credentials: {
    reportingDb: ServiceCredentialRef;
  };
};
```

Правило: контекст исполнения строит платформа. Отчет не должен конструировать такой контекст самостоятельно.

Текущее состояние реализации:

- В рантайме в отчеты передается `CurrentUser`.
- Контроль доступа к данным выполняется на уровне repository-слоя.
- Репозитории уже отделены от отчетов интерфейсами, поэтому миграция `CurrentUser -> ReportExecutionContext` может быть сделана эволюционно, без массовой переписи отчетов.

### 1.3 Блоки (актуальная схема)

Ниже блоки, которые используются в runtime-сценариях платформы:

1. `Frontend`

- Реализация: `apps/report-web`.
- Ответственность: UX flow Step1/Step2/Step3/Step4, вызовы API через RTK Query.

2. `Report API`

- Реализация: `apps/report-api`.
- Ответственность: публичные endpoints (`/reports`, `/launch`, `/report-runs`, `/generated-files`), валидация и оркестрация запуска.

3. `Report Definitions`

- Реализация: `libs/report-definitions/*`.
- Ответственность: metadata отчета, `launchParamsSchema`, бизнес-логика source/service, генерация результата.

4. `Repos & External API`

- Реализация: `libs/report-platform/data-access` + `libs/report-platform/external-api`.
- Ответственность: внутренние данные (tenant/org/sales/products/channels), внешние интеграции, credential flow, resilience.

5. `XLSX Builder, registry`

- Реализация: `libs/report-platform/xlsx` + `libs/report-platform/registry` + сборка реестра в `apps/report-api/src/report-registry.factory.ts`.
- Ответственность: реестр report definitions, generic запуск по `reportCode`, формирование XLSX-файлов.

Примечание по `contracts`:

- `libs/report-platform/contracts` остается кросс-срезом между frontend/backend, но в текущей блок-схеме не выделяется как самостоятельный runtime-блок.

### 1.4 Потоки данных

#### 1.4.1 Launch flow

1. UI вызывает `POST /reports/:reportCode/launch`.
2. API валидирует payload и права.
3. Создается `reportInstanceId`.
4. Store фиксирует queued instance в FS.
5. API отвечает сразу: `{ reportInstanceId, status: 'queued' }`.
6. `ReportInstanceRunner` запускает fork worker process.
7. Worker выполняет отчет из registry и отправляет progress/complete/fail через IPC.
8. Parent process обновляет stage/progress в store.
9. При успехе сохраняется `artifact.bin`, instance переводится в `completed`.
10. UI опрашивает `GET /report-runs/:reportInstanceId` и на terminal status переходит к результату.

#### 1.4.2 Recovery и история

- Текущий state запуска: `GET /report-runs/:reportInstanceId`.
- История по коду отчета: `GET /reports/:reportCode/instances`.
- Скачивание артефакта: `GET /generated-files/:fileId`.

#### 1.4.3 Логическая схема

```text
Frontend
  -> Report API
  -> XLSX Builder, registry
  -> Report Definitions
      -> Repos & External API
      -> XLSX Builder, registry
  -> Report API (status/history/download)
```

Детализация с код-ссылками: [docs/report-runtime-call-chain.md](./docs/report-runtime-call-chain.md).

### 1.5 Границы ответственности

Платформа отвечает за:

- запуск/оркестрацию отчета;
- lifecycle instance (`queued/running/completed/failed`);
- авторизацию и tenant scope проверки на инфраструктурном уровне;
- работу с внешними credential flow;
- хранение и выдачу артефактов;
- API-контракты и совместимость frontend/backend.

Отчет отвечает за:

- бизнес-логику и сбор source-данных;
- mapping данных в результат;
- metadata (`code`, `title`, `description`, `minRoleToLaunch`, `externalDependencies`);
- launch-контракт (`launchParamsSchema` и типизированные launch params);
- правила fallback/criticality для внешних зависимостей.
- разделение асинхронных операций на `critical` и `non-critical`.
- `critical`: падение операции приводит к падению сборки отчета.
- `non-critical`: ошибка операции не останавливает сборку, отчет продолжает работу с явным fallback.
- В текущей версии эта модель уже частично имплементирована, но еще не развита в единый стандарт для всех отчетов.
- Подробные правила retry/fallback: [docs/external-dependency-resilience.md](./docs/external-dependency-resilience.md).

Шаблон XLSX отвечает за:

- производные вычисления (формулы, cross-sheet derivations);
- структуру конечного документа.

Это осознанная граница: разработчик отчета управляет входными данными и заполнением шаблона, а не переписывает формульную модель в TypeScript.

## 2. Как добавить новый отчет: пошаговая инструкция

### 2.1 Создать пакет отчета

Создайте `libs/report-definitions/<report-code>/`:

```text
src/
  <report-code>.source.ts
  <report-code>.service.ts
  <report-code>.definition.ts
  index.ts
template-assets/
  <template>.xlsx
```

Если отчет не файловый, `template-assets` и XLSX-слой не обязательны. Локальный `<report-code>.contract.ts` в `report-definitions` допустим для source/result схем, но launch params должны жить в platform contracts.

### 2.2 Описать контракты

Launch params описываются в:

`libs/report-platform/contracts/src/reports/<report-code>.contract.ts`

В контракте должны быть:

- `REPORT_CODE` константа;
- `LaunchParamsSchema`;
- `LaunchParams` тип через `z.infer`.

Экспорт обязателен через:

- `libs/report-platform/contracts/src/reports/index.ts`
- `libs/report-platform/contracts/src/index.ts`.

### 2.3 Реализовать source/service

- `source` собирает данные из repositories и внешних API.
- `service` формирует конечный результат (например, `BuiltFile`).
- Репозиторные зависимости передаются через конструктор.
- Для каждой асинхронной операции задается политика `critical/non-critical` и поведение при ошибке (fail-fast или продолжение с fallback).
- Реализационные детали и паттерны resilience: [docs/external-dependency-resilience.md](./docs/external-dependency-resilience.md).

Запрещено:

- прямой доступ к БД из report-definition/service;
- создание ad-hoc HTTP клиентов в обход `external-api` слоя;
- ручная сборка execution context внутри отчета.

### 2.4 Реализовать `create<ReportName>Definition(...)`

В `.definition.ts` верните `ReportDefinition`:

- `code`, `title`, `description`;
- `launchParamsSchema`;
- `getMetadata(currentUser)`;
- `launch(currentUser, params, options?)`.

Требование:

- `launch` принимает уже типизированные `params` (`TLaunchParams`).
- Серверная валидация происходит в `Report API` через `reportDefinition.launchParamsSchema` до вызова раннера.

Рекомендуемый порядок в `launch`:

1. подготовка зависимостей;
2. запуск service/source;
3. валидация результата;
4. возврат результата.

### 2.5 Зарегистрировать отчет в registry

Файлы:

- `apps/report-api/src/report-registry.factory.ts`
- при новых зависимостях: `apps/report-api/src/reporting.providers.ts`

Действия:

1. Добавить создание definition в `new ReportRegistry([...])`.
2. Добавить provider tokens/factories для новых infrastructure зависимостей.

### 2.6 Интегрировать frontend

Базовый runtime уже generic. Для нового отчета нужно:

1. Добавить report-specific Step2 компонент в `apps/report-web/src/features/report-launcher-runtime/containers/step2/components/`.
2. Добавить его в `reportStep2Registry` (`apps/report-web/src/features/report-launcher-runtime/containers/step2/reportStep2Registry.ts`).
3. Использовать `LaunchParamsSchema` в форме и отправлять typed `ReportLaunchDraft`.
4. Проверить launch payload и навигацию на `/report-runs/:reportInstanceId`.

### 2.7 Проверка сценария вручную

1. `GET /reports` содержит новый `reportCode`.
2. `GET /reports/:code/metadata` возвращает валидную metadata.
3. `POST /reports/:code/launch` возвращает `reportInstanceId`.
4. `GET /report-runs/:reportInstanceId` доходит до `completed` или `failed`.
5. Для успешного запуска работает `GET /generated-files/:fileId`.
6. `GET /reports/:reportCode/instances` показывает запуск в истории.

### 2.8 Тесты и quality gate

Минимум:

- unit tests для source/service/validation;
- API smoke для launch/status;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## 3. Принятые решения и альтернативы

### Решение 1: Каноническая сущность `reportInstanceId`

Что выбрано:

- единый идентификатор запуска от момента `launch` до `download/history`.

Альтернативы:

- старый dual-мир (`jobId` + отдельные сущности результата);
- полностью синхронный `POST /launch` с немедленным возвратом файла.

Почему выбрано:

- URL recovery и polling становятся тривиальными;
- одинаковая модель для `completed` и `failed`;
- меньше расхождений между backend/frontend контрактами.

### Решение 2: XLSX template как часть модели отчета

Что выбрано:

- шаблонный файл является частью domain model отчета;
- производные данные рассчитываются формулами в самом шаблоне;
- report code заполняет исходные данные и читает расчетный результат.

Альтернатива:

- переносить все производные вычисления в TypeScript-код.

Почему выбрано:

- меньше риска расхождения между аналитической формульной моделью и кодом;
- шаблон становится black box для report developer: зона ответственности отчета ограничена входными данными и маппингом;
- проще поддерживать изменения бизнес-формул силами аналитиков/владельцев шаблона.

### Решение 3: Repository boundary + mock реализации в отдельном Nx space

Что выбрано:

- интерфейсы и mock реализации находятся в `libs/report-platform/data-access`.

Альтернатива:

- прямые SQL/ORM вызовы из report-definition.

Почему выбрано:

- отчет не привязывается к конкретной БД и инфраструктуре;
- доступ по tenant scope контролируется в одном месте;
- текущее решение можно развивать до production без слома API отчетов.

Что ожидается в реальности:

- production-адаптеры доступа к БД (например Postgres/ClickHouse) в отдельном инфраструктурном модуле Nx;
- DI в `reporting.providers.ts` переключается с mock на real adapters;
- контракты репозиториев сохраняются, поэтому migration path эволюционный.

### Решение 4: Асинхронный запуск через fork worker (сейчас)

Что выбрано:

- `child_process.fork` на каждый запуск.

Альтернативы:

- синхронная генерация в HTTP-request;
- сразу полноценная distributed-очередь.

Почему выбрано:

- быстрый старт прототипа без лишней инфраструктуры;
- уже есть изоляция тяжелой генерации от request lifecycle.

План для production:

- очередь задач через RabbitMQ + BullMQ;
- отдельные worker-поды, retry policy, DLQ, backpressure, idempotency.

### Решение 5: File-system persistence для instance и артефактов

Что выбрано:

- `meta.json` + `artifact.bin` в `GENERATED_REPORTS_DIR`.

Альтернативы:

- только in-memory store;
- сразу DB + object storage.

Почему выбрано:

- простая и прозрачная отладка прототипа;
- данные переживают restart процесса;
- не требует схемы БД на ранней фазе.

Ограничения:

- нет централизованного поиска/аналитики;
- нет распределенного доступа к артефактам;
- сложнее горизонтально масштабировать API.

### Решение 6: Стратегии повторных запросов к внешним ресурсам (retry/refetch)

Что выбрано:

- для внешних ресурсов используется набор стратегий повторного запроса, а не единая жесткая политика;
- стратегия выбирается на уровне отчета/сервиса в зависимости от бизнес-критичности операции;
- для `critical` и `non-critical` операций применяются разные сценарии завершения (падение отчета или fallback);
- базовая имплементация уже есть в `executeWithResilience` и `RetryStrategies` (`libs/report-platform/external-api`);
- структура еще не развита до полного платформенного стандарта.

Альтернативы:

- одна фиксированная стратегия retry/refetch для всех интеграций;
- отсутствие повторных запросов (single-shot);
- локальная ручная реализация повторов в каждом отчете.

Почему выбрано:

- разные внешние интеграции имеют разный профиль сбоев и SLA;
- единый набор стратегий снижает копипасту и делает поведение предсказуемым;
- можно расширять каталог стратегий без изменения публичного контракта платформы.
- Практический гайд по реализации: [docs/external-dependency-resilience.md](./docs/external-dependency-resilience.md).

## 4. Что не сделали, почему и что нужно для production

### 4.1 Не сделано в текущей версии

1. Очереди и распределенные worker-процессы

- Сейчас fork worker внутри API-процесса.
- Для production нужен переход на RabbitMQ + BullMQ.

2. CI/CD не доведен до production-grade

- Есть базовые workflow (`ci`, `docker-images`, `deploy`).
- Нет полного контура: environment promotion, release governance, security gates, rollback orchestration, policy checks.

3. Реальные репозитории БД

- Сейчас используются mock реализации.
- Это достаточно для разработки report contract и UI flow, но недостаточно для продовой нагрузки и аудита.

4. Полноценная аутентификация и авторизация

- Сейчас mock user header.
- Нужны real authn/authz, audit trail и сервисные политики.
- Подходы вида хранения session/JWT токенов в web storage недопустимы для production; текущий mock-flow оставлен только для ускорения прототипирования.

5. Глубокая feature-модульность frontend/backend

- Структура уже расширяема, но радикальную реорганизацию сознательно отложили.
- Причина: сначала нужно пройти этап накопления доменной вариативности (пару десятков отчетов), чтобы делать структурные решения на реальных паттернах.

6. Shared settings пока захардкожены

- Это компромисс прототипа: показана модель передачи credentials (`manual`/`shared_setting`), но не production-уровень хранения секретов.
- Для production нужен защищенный secret manager, ротация и контроль доступа.
- Важно сохранить удобство использования без компромисса по безопасности.

### 4.2 Что добавлять для production (приоритет)

P0:

1. RabbitMQ + BullMQ queue orchestration с retry/DLQ/idempotency.
2. Замена mock repositories на production adapters.
3. Object storage для артефактов (S3/MinIO) + metadata store в БД.
4. Полноценная auth модель (OIDC/JWT/RBAC), запрет `x-mock-user` в runtime.
5. Наблюдаемость: structured logs, metrics, traces, алерты по SLA/SLO.

P1:

1. CI/CD окружения (`dev/stage/prod`) с promotion и approval gates.
2. Security scanning (SAST/SCA/container scan), SBOM, secret scanning.
3. Runbook-и, rollback playbooks, disaster recovery проверки.
4. Политики ретенции и lifecycle management generated reports.

P2:

1. Capacity/load testing для очередей и XLSX pipeline.
2. Multi-tenant rate limits и quota management.
3. Дальнейшая стандартизация feature-структуры frontend/backend после накопления каталога отчетов.

## 5. Краткая карта кода

- API controllers: `apps/report-api/src/reports.controller.ts`, `apps/report-api/src/report-runs.controller.ts`
- Async orchestration: `apps/report-api/src/report-instance.runner.ts`, `apps/report-api/src/report-instance.worker.ts`
- Persistence: `apps/report-api/src/report-instance.store.ts`
- Registry wiring: `apps/report-api/src/report-registry.factory.ts`, `apps/report-api/src/reporting.providers.ts`
- Report examples:
  - `libs/report-definitions/simple-sales-summary/*`
  - `libs/report-definitions/simple-sales-summary-xlsx/*`
- Platform libs:
  - `libs/report-platform/contracts/*`
  - `libs/report-platform/data-access/*`
  - `libs/report-platform/external-api/*`
  - `libs/report-platform/xlsx/*`
