# How To Add A New Report

Практическая инструкция для текущего состояния репозитория.

Канонический архитектурный контекст: `ARCHITECTURE.md`.

## 1. Создать пакет отчета

Создайте директорию:

```text
libs/report-definitions/<report-code>/
  src/
    <report-code>.contract.ts
    <report-code>.source.ts
    <report-code>.service.ts
    <report-code>.definition.ts
    index.ts
  template-assets/
    <template>.xlsx
```

Если отчет не файловый, `template-assets` можно не добавлять.

## 2. Описать контракты (zod)

В `<report-code>.contract.ts`:

- `ParamsSchema`;
- типы через `z.infer`;
- при необходимости source/result schema.

Требования:

- params валидируются в `launch(...)`;
- ошибки валидации возвращаются как `ApiError` с `code: 'VALIDATION_ERROR'`.

## 3. Реализовать source/service

- `source` собирает данные и внешние зависимости.
- `service` формирует конечный результат.

Правила:

- внутренние данные только через `@report-platform/data-access`;
- внешние API только через `@report-platform/external-api`;
- не подключать БД напрямую в отчете.

## 4. Реализовать definition

В `<report-code>.definition.ts` верните `ReportDefinition`:

- `code`, `title`, `description`;
- `getMetadata(currentUser)`;
- `launch(currentUser, params, options?)`.

Ожидаемый pipeline в `launch`:

1. parse params;
2. подготовить зависимости;
3. вызвать service/source;
4. вернуть валидный результат.

## 5. Если отчет XLSX

Используйте `@report-platform/xlsx` (`fillTemplateWorkbook`).

Принцип модели:

- XLSX template является частью модели отчета;
- производные вычисления делаются формулами в шаблоне;
- код отчета подготавливает исходные данные и заполняет template.

## 6. Зарегистрировать отчет в API

Обновите:

- `apps/report-api/src/report-registry.factory.ts`
- при новых зависимостях: `apps/report-api/src/reporting.providers.ts`

Без регистрации в `ReportRegistry` отчет не появится в API.

## 7. Интегрировать frontend

Минимум:

1. metadata корректно описывает `fields` и `externalDependencies`;
2. step2 строит launch payload, совместимый с `ParamsSchema`;
3. после launch переход на `/report-runs/:reportInstanceId`.

Основной runtime API фронта: `apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts`.

## 8. Проверить async flow

1. `POST /reports/:reportCode/launch` -> есть `reportInstanceId`.
2. `GET /report-runs/:reportInstanceId` -> корректные статусы/stages.
3. `GET /reports/:reportCode/instances` -> запуск виден в истории.
4. Для completed: доступен `GET /generated-files/:fileId`.

## 9. Внешние зависимости (если есть)

Используйте explicit credential flow:

- `manual`;
- `shared_setting`.

Resilience-подход: [docs/external-dependency-resilience.md](./external-dependency-resilience.md).

Для каждой зависимости явно задайте:

- `critical` или `optional`;
- retry strategy;
- fallback (если `optional`).

## 10. Checklist завершения

- Отчет виден в `GET /reports`.
- Metadata валидна (`GET /reports/:code/metadata`).
- Launch работает и возвращает `reportInstanceId`.
- Статус читается через `GET /report-runs/:reportInstanceId`.
- История по коду работает (`GET /reports/:reportCode/instances`).
- Для файлового отчета работает download endpoint.
- Нет прямого доступа к БД из report-definition.
- Внешние зависимости проходят через platform external-api слой.
- Добавлены тесты и пройдены `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
