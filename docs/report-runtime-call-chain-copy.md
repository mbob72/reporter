# Поток Вызовов Между Блоками

Ниже фактические межблочные вызовы по коду (только места, где один блок вызывает другой).

## Вход на страницу

1. `Frontend (router) -> Frontend (Step1)`:
   [`router.tsx#L20`](../apps/report-web/src/app/router/router.tsx#L20),
   [`router.tsx#L24`](../apps/report-web/src/app/router/router.tsx#L24).
2. `Frontend (Step1) -> Client API layer`:
   [`Step1ReportSelectionContainer.tsx#L26`](../apps/report-web/src/features/report-launcher-runtime/containers/Step1ReportSelectionContainer.tsx#L26),
   [`Step1ReportSelectionContainer.tsx#L27`](../apps/report-web/src/features/report-launcher-runtime/containers/Step1ReportSelectionContainer.tsx#L27).
3. `Client API layer -> Report API` (`GET /reports`, `GET /reports/:code/instances`):
   [`reportApi.ts#L80`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L80),
   [`reportApi.ts#L177`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L177).
4. `Report API -> Report Registry`:
   [`reports.controller.ts#L61`](../apps/report-api/src/reports.controller.ts#L61).
5. `Report API (controller) -> ReportInstanceStore service` (история инстансов):
   [`reports.controller.ts#L268`](../apps/report-api/src/reports.controller.ts#L268).
6. `ReportInstanceStore service -> File storage` (чтение из `.generated-reports`):
   [`report-instance.store.ts#L308`](../apps/report-api/src/report-instance.store.ts#L308),
   [`report-instance.store.ts#L315`](../apps/report-api/src/report-instance.store.ts#L315),
   [`report-instance.store.ts#L326`](../apps/report-api/src/report-instance.store.ts#L326).

## Конфигурация и запуск

1. `Frontend (Step2) -> Client API layer` (metadata/tenants/org/shared-settings):
   [`useStep2DataQueries.ts#L17`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2DataQueries.ts#L17),
   [`useStep2DataQueries.ts#L21`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2DataQueries.ts#L21),
   [`useStep2DataQueries.ts#L25`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2DataQueries.ts#L25),
   [`useStep2DataQueries.ts#L37`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2DataQueries.ts#L37).
2. `Client API layer -> Report API`:
   [`reportApi.ts#L92`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L92),
   [`reportApi.ts#L104`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L104),
   [`reportApi.ts#L119`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L119),
   [`reportApi.ts#L134`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L134).
3. `Frontend (Step2) -> Client API layer -> Report API` (launch `POST /reports/:code/launch`):
   [`useStep2LaunchActions.ts#L44`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2LaunchActions.ts#L44),
   [`reportApi.ts#L149`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L149),
   [`reports.controller.ts#L194`](../apps/report-api/src/reports.controller.ts#L194).
4. `Report API -> Runner -> Worker`:
   [`reports.controller.ts#L245`](../apps/report-api/src/reports.controller.ts#L245),
   [`report-instance.runner.ts#L161`](../apps/report-api/src/report-instance.runner.ts#L161),
   [`report-instance.runner.ts#L202`](../apps/report-api/src/report-instance.runner.ts#L202),
   [`report-instance.worker.ts#L47`](../apps/report-api/src/report-instance.worker.ts#L47).
5. `Worker -> Report Registry -> Report Definitions`:
   [`report-launch.executor.ts#L24`](../apps/report-api/src/report-launch.executor.ts#L24),
   [`report-launch.executor.ts#L43`](../apps/report-api/src/report-launch.executor.ts#L43).
6. `Report Registry -> Report Definitions` (регистрация дефиниций):
   [`report-registry.factory.ts#L37`](../apps/report-api/src/report-registry.factory.ts#L37),
   [`report-registry.factory.ts#L43`](../apps/report-api/src/report-registry.factory.ts#L43).

## Definitions -> Low-Level/XLSX/File Storage

1. `Report Definitions -> Low-level methods`:
   [`simple-sales-summary.definition.ts#L58`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.definition.ts#L58),
   [`simple-sales-summary.source.ts#L136`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts#L136),
   [`simple-sales-summary.source.ts#L138`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts#L138),
   [`simple-sales-summary.source.ts#L95`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts#L95),
   [`open-weather.client.ts#L88`](../libs/report-platform/external-api/src/open-weather.client.ts#L88),
   [`simple-sales-summary-xlsx.source.ts#L58`](../libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.source.ts#L58),
   [`simple-sales-summary-xlsx.source.ts#L59`](../libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.source.ts#L59).
2. `Report Definitions -> XLSX Builder` (через `fillTemplateWorkbook`):
   [`simple-sales-summary.service.ts#L43`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.service.ts#L43),
   [`simple-sales-summary-xlsx.definition.ts#L88`](../libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.definition.ts#L88),
   [`template-runtime.ts#L172`](../libs/report-platform/xlsx/src/template-runtime.ts#L172).
3. `Runner -> File storage` (сохранение артефакта/метаданных):
   [`report-instance.runner.ts#L237`](../apps/report-api/src/report-instance.runner.ts#L237),
   [`report-instance.store.ts#L248`](../apps/report-api/src/report-instance.store.ts#L248),
   [`report-instance.runner.ts#L255`](../apps/report-api/src/report-instance.runner.ts#L255).
4. `Frontend -> Report API -> ReportInstanceStore service -> File storage` (скачивание результата):
   [`Step4ResultCard.tsx#L61`](../apps/report-web/src/features/report-launcher-story/components/Step4ResultCard.tsx#L61),
   [`ReportInstanceList.tsx#L157`](../apps/report-web/src/features/report-launcher-story/components/ReportInstanceList.tsx#L157),
   [`reports.controller.ts#L294`](../apps/report-api/src/reports.controller.ts#L294),
   [`reports.controller.ts#L298`](../apps/report-api/src/reports.controller.ts#L298),
   [`report-instance.store.ts#L284`](../apps/report-api/src/report-instance.store.ts#L284),
   [`report-instance.store.ts#L294`](../apps/report-api/src/report-instance.store.ts#L294).
