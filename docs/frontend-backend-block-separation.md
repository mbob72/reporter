# Изменения По Блокам: Разделение Frontend/Backend

Документ фиксирует изменения по архитектурным блокам и актуализирован под текущее состояние кода (включая JWT demo-auth bootstrap).

Блоки:
`Frontend`, `Report API`, `Report Definitions`, `Repos & External API`, `XLSX Builder, registry`.

## Frontend

- Step2 переключается на report-specific компонент через registry по `reportCode`:
  [`Step2LaunchConfigurationContainer.tsx#L30`](../apps/report-web/src/features/report-launcher-runtime/containers/Step2LaunchConfigurationContainer.tsx#L30),
  [`reportStep2Registry.ts#L9`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/reportStep2Registry.ts#L9).
- Локальная Zod-валидация формы перед launch на примере `simple-sales-summary`:
  [`SimpleSalesSummaryStep2.tsx#L113`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/components/SimpleSalesSummaryStep2.tsx#L113).
- Launch draft хранится типизированным union в redux state:
  [`launcherSlice.ts#L17`](../apps/report-web/src/features/report-launcher-runtime/store/launcherSlice.ts#L17),
  [`useStep2LaunchActions.ts#L30`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2LaunchActions.ts#L30).
- Frontend больше не отправляет `x-mock-user`; перед business-запросами bootstrap-ит Bearer token через dev endpoint:
  [`reportApi.ts#L61`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L61),
  [`reportApi.ts#L83`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L83),
  [`ReportLaunchShell.tsx#L34`](../apps/report-web/src/features/report-launcher-runtime/containers/ReportLaunchShell.tsx#L34).

## Report API

- Launch endpoint теперь тонкий: route-level pipe + `@CurrentUser()` + делегирование в service:
  [`reports.controller.ts#L74`](../apps/report-api/src/reports.controller.ts#L74),
  [`reports.controller.ts#L83`](../apps/report-api/src/reports.controller.ts#L83).
- Валидация `params` через `launchParamsSchema` выбранного definition в сервисном слое:
  [`reports-launch.service.ts#L38`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L38).
- В раннере внутренняя нормализация параметров для worker выделена в отдельный шаг:
  [`report-instance.runner.ts#L177`](../apps/report-api/src/report-instance.runner.ts#L177).
- Global HTTP слой централизован (`JWT guard`, `filter`, `interceptor`, `request-id middleware`):
  [`app.module.ts#L24`](../apps/report-api/src/app.module.ts#L24),
  [`app.module.ts#L30`](../apps/report-api/src/app.module.ts#L30),
  [`app.module.ts#L34`](../apps/report-api/src/app.module.ts#L34),
  [`app.module.ts#L40`](../apps/report-api/src/app.module.ts#L40).

## Report Definitions

- Definition-слой использует generic сигнатуру `ReportDefinition<TLaunchParams, TResult>` с обязательным `launchParamsSchema`:
  [`simple-sales-summary.definition.ts#L44`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.definition.ts#L44),
  [`simple-sales-summary-xlsx.definition.ts#L58`](../libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.definition.ts#L58).
- `simple-sales-summary` запускается с явно переданными `tenantId/organizationId` из launch params:
  [`simple-sales-summary.definition.ts#L71`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.definition.ts#L71),
  [`simple-sales-summary.service.ts#L25`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.service.ts#L25),
  [`simple-sales-summary.source.ts#L110`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts#L110).

## Repos & External API

- `ExternalClientFactory` использует единый тип `OpenWeatherCredentialInput` из `@report-platform/contracts`:
  [`external-client.factory.ts#L4`](../libs/report-platform/external-api/src/external-client.factory.ts#L4).
- Source-слой simple-sales-summary выполняет tenant scope check перед вызовами repository/внешнего API:
  [`simple-sales-summary.source.ts#L117`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts#L117).

## XLSX Builder, registry

- Registry-контракт включает `launchParamsSchema`, связывая runtime launch с типизированными параметрами:
  [`report-registry.ts#L16`](../libs/report-platform/registry/src/report-registry.ts#L16),
  [`report-registry.ts#L20`](../libs/report-platform/registry/src/report-registry.ts#L20).
- XLSX runtime (`libs/report-platform/xlsx`) в этом изменении не менялся; изменения были на уровне интеграции definition/registry/API transport layer.
