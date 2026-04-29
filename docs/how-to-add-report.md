# How To Add A New Report

Практическая инструкция для актуальной runtime-модели.

Канонический архитектурный контекст: `ARCHITECTURE.md`.

## 1. Создать пакет report definition

Создайте директорию:

```text
libs/report-definitions/<report-code>/
  src/
    <report-code>.source.ts
    <report-code>.service.ts
    <report-code>.definition.ts
    index.ts
  template-assets/
    <template>.xlsx
```

Примечания:

- `template-assets` нужен только для файловых/XLSX отчетов.
- Локальный `<report-code>.contract.ts` в `report-definitions` можно добавлять для source/result схем, но не для launch params.

## 2. Описать launch-контракт в platform contracts

Создайте файл:

```text
libs/report-platform/contracts/src/reports/<report-code>.contract.ts
```

В нем должны быть:

- `REPORT_CODE` константа;
- `LaunchParamsSchema` (zod);
- `LaunchParams` тип через `z.infer`.

Обязательно экспортируйте контракт из:

- `libs/report-platform/contracts/src/reports/index.ts`
- `libs/report-platform/contracts/src/index.ts`.

## 3. Реализовать definition с typed launch params

В `<report-code>.definition.ts` верните `ReportDefinition<TLaunchParams, TResult>`:

- `code`, `title`, `description`;
- `launchParamsSchema`;
- `getMetadata(currentUser)`;
- `launch(currentUser, params, options?)`.

Ключевое правило текущей версии:

- `Report API` валидирует launch payload через `reportDefinition.launchParamsSchema` до старта раннера.
- В `launch` должны приходить уже типизированные params (`TLaunchParams`).

## 4. Реализовать source/service

- `source` получает данные через `@report-platform/data-access`.
- Внешние API вызываются только через `@report-platform/external-api`.
- `service` формирует конечный результат (например `BuiltFile`).

Для внешних зависимостей задайте resilience-политику:

- `critical`/`optional`;
- retry strategy;
- fallback для `optional`.

Подробно: [external-dependency-resilience.md](./external-dependency-resilience.md).

## 5. Если отчет XLSX

Используйте `@report-platform/xlsx` (`fillTemplateWorkbook`).

Принцип:

- XLSX template — часть модели отчета;
- производные вычисления остаются в формулах template;
- TypeScript код заполняет исходные данные и возвращает файл.

## 6. Зарегистрировать отчет в backend

Обновите:

- `apps/report-api/src/report-registry.factory.ts` — добавить `create<ReportName>Definition(...)` в `createReportRegistry(...)`;
- `apps/report-api/src/reporting.providers.ts` — добавить/подключить новые зависимости при необходимости.

Без регистрации в `ReportRegistry` отчет не появится в API.

## 7. Интегрировать Step2 на frontend

Текущая модель Step2 — report-specific компоненты.

Сделайте:

1. Добавьте конфигурационный тип в `apps/report-web/src/features/report-launcher-runtime/containers/step2/types.ts`.
2. Добавьте Step2-компонент в `apps/report-web/src/features/report-launcher-runtime/containers/step2/components/`.
3. Зарегистрируйте компонент в `apps/report-web/src/features/report-launcher-runtime/containers/step2/reportStep2Registry.ts`.
4. Внутри формы валидируйте данные через соответствующий `LaunchParamsSchema` и отправляйте `ReportLaunchDraft`.

## 8. Проверить runtime flow

1. `GET /reports` — новый `reportCode` присутствует.
2. `GET /reports/:code/metadata` — metadata валидна.
3. `POST /reports/:reportCode/launch` — возвращает `reportInstanceId`.
4. `GET /report-runs/:reportInstanceId` — статус доходит до `completed`/`failed`.
5. `GET /reports/:reportCode/instances` — запуск появляется в истории.
6. Для файлового отчета `GET /generated-files/:fileId` отдает артефакт.

## 9. Checklist завершения

- Launch params контракт добавлен в `libs/report-platform/contracts/src/reports` и экспортирован.
- `ReportDefinition` использует typed `launchParamsSchema` и typed `launch` params.
- Source/service не обходят `data-access` и `external-api` слои.
- Для нового `reportCode` есть Step2 компонент и запись в `reportStep2Registry`.
- Добавлены/обновлены тесты (definition/source/service/Step2/API).
- Пройдены `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
