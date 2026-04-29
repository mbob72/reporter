# Изменения По Блокам: Разделение Frontend/Backend

Документ фиксирует изменения из коммита `7f097ae7e846bf1d45e7db656c215d39d3d149c8` в разрезе актуальных архитектурных блоков:
`Frontend`, `Report API`, `Report Definitions`, `Repos & External API`, `XLSX Builder, registry`.

## Frontend

- Step2 переведен с одной универсальной формы на report-specific компоненты, выбираемые по `reportCode` через registry:
  [`Step2LaunchConfigurationContainer.tsx#L35`](../apps/report-web/src/features/report-launcher-runtime/containers/Step2LaunchConfigurationContainer.tsx#L35),
  [`reportStep2Registry.ts#L9`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/reportStep2Registry.ts#L9).
- Добавлены отдельные формы и локальная Zod-валидация перед запуском:
  [`SimpleSalesSummaryStep2.tsx#L59`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/components/SimpleSalesSummaryStep2.tsx#L59),
  [`SimpleSalesSummaryXlsxStep2.tsx#L17`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/components/SimpleSalesSummaryXlsxStep2.tsx#L17).
- Redux-state запуска упрощен: хранится typed `launchDraft` вместо набора разрозненных полей:
  [`launcherSlice.ts#L31`](../apps/report-web/src/features/report-launcher-runtime/store/launcherSlice.ts#L31),
  [`useStep2LaunchActions.ts#L41`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2LaunchActions.ts#L41).

## Report API

- В launch endpoint добавлена явная валидация `params` через схему выбранного report definition:
  [`reports.controller.ts#L230`](../apps/report-api/src/reports.controller.ts#L230),
  [`reports.controller.ts#L248`](../apps/report-api/src/reports.controller.ts#L248).
- В раннере входные `params` стали `unknown`, а внутренняя нормализация параметров для worker выделена в отдельный шаг:
  [`report-instance.runner.ts#L177`](../apps/report-api/src/report-instance.runner.ts#L177).

## Report Definitions

- Definition-слой переведен на generic сигнатуру `ReportDefinition<TLaunchParams, TResult>` с обязательным `launchParamsSchema`:
  [`simple-sales-summary.definition.ts#L44`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.definition.ts#L44),
  [`simple-sales-summary-xlsx.definition.ts#L58`](../libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.definition.ts#L58).
- `simple-sales-summary` теперь запускается с явно переданными `tenantId/organizationId` из launch params, вместо неявного выбора:
  [`simple-sales-summary.definition.ts#L71`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.definition.ts#L71),
  [`simple-sales-summary.service.ts#L25`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.service.ts#L25),
  [`simple-sales-summary.source.ts#L110`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts#L110).

## Repos & External API

- `ExternalClientFactory` использует единый тип `OpenWeatherCredentialInput` из `@report-platform/contracts`:
  [`external-client.factory.ts#L4`](../libs/report-platform/external-api/src/external-client.factory.ts#L4).
- Source-слой simple-sales-summary получил явную проверку tenant scope перед вызовами repository/внешнего API:
  [`simple-sales-summary.source.ts#L117`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts#L117).

## XLSX Builder, registry

- Registry-контракт усилен: в `ReportDefinition` добавлен `launchParamsSchema`, что связывает runtime launch с типизированными параметрами:
  [`report-registry.ts#L16`](../libs/report-platform/registry/src/report-registry.ts#L16),
  [`report-registry.ts#L20`](../libs/report-platform/registry/src/report-registry.ts#L20).
- XLSX runtime (`libs/report-platform/xlsx`) в этом коммите не менялся; изменения затронули уровень интеграции definition/registry.
