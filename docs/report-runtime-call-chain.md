# Сценарии Между Архитектурными Блоками

Блоки в этом описании:
`Frontend` / `Report API` / `Report Definitions` / `Repos & External API` / `XLSX Builder, registry`.

`Contracts` намеренно не учитывается.

## Сценарий 1. Открытие страницы и загрузка списка отчетов

1. `Frontend -> Report API` (загрузка списка отчетов и истории инстансов):
   [`Step1ReportSelectionContainer.tsx#L26`](../apps/report-web/src/features/report-launcher-runtime/containers/Step1ReportSelectionContainer.tsx#L26),
   [`Step1ReportSelectionContainer.tsx#L27`](../apps/report-web/src/features/report-launcher-runtime/containers/Step1ReportSelectionContainer.tsx#L27),
   [`reportApi.ts#L80`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L80),
   [`reportApi.ts#L177`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L177),
   [`reports.controller.ts#L24`](../apps/report-api/src/reports.controller.ts#L24),
   [`reports.controller.ts#L110`](../apps/report-api/src/reports.controller.ts#L110).

2. `Report API -> Service Layer` (контроллер делегирует в query-service):
   [`reports.controller.ts#L29`](../apps/report-api/src/reports.controller.ts#L29),
   [`reports.controller.ts#L114`](../apps/report-api/src/reports.controller.ts#L114),
   [`reports-query.service.ts#L36`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L36),
   [`reports-query.service.ts#L132`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L132).

3. `Report API -> XLSX Builder, registry` (через реестр отчетов):
   [`reports-query.service.ts#L37`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L37),
   [`reports-query.service.ts#L133`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L133),
   [`report-registry.ts#L54`](../libs/report-platform/registry/src/report-registry.ts#L54),
   [`report-registry.ts#L58`](../libs/report-platform/registry/src/report-registry.ts#L58).

4. `XLSX Builder, registry -> Report Definitions` (реестр берет метаданные/report definition):
   [`report-list.ts#L8`](../libs/report-platform/registry/src/report-list.ts#L8),
   [`report-list.ts#L12`](../libs/report-platform/registry/src/report-list.ts#L12),
   [`report-registry.ts#L71`](../libs/report-platform/registry/src/report-registry.ts#L71),
   [`simple-sales-summary.definition.ts#L50`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.definition.ts#L50),
   [`simple-sales-summary-xlsx.definition.ts#L70`](../libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.definition.ts#L70).

## Сценарий 2. Конфигурация отчета (Step 2)

1. `Frontend -> Report API` (metadata/tenants/organizations/shared-settings):
   [`useStep2DataQueries.ts#L17`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2DataQueries.ts#L17),
   [`useStep2DataQueries.ts#L21`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2DataQueries.ts#L21),
   [`useStep2DataQueries.ts#L25`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2DataQueries.ts#L25),
   [`useStep2DataQueries.ts#L37`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2DataQueries.ts#L37),
   [`reportApi.ts#L92`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L92),
   [`reportApi.ts#L104`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L104),
   [`reportApi.ts#L119`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L119),
   [`reportApi.ts#L134`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L134),
   [`reports.controller.ts#L41`](../apps/report-api/src/reports.controller.ts#L41),
   [`reports.controller.ts#L51`](../apps/report-api/src/reports.controller.ts#L51),
   [`reports.controller.ts#L65`](../apps/report-api/src/reports.controller.ts#L65),
   [`reports.controller.ts#L75`](../apps/report-api/src/reports.controller.ts#L75).

2. `Report API -> Service Layer` (все read сценарии идут через query-service):
   [`reports-query.service.ts#L47`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L47),
   [`reports-query.service.ts#L67`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L67),
   [`reports-query.service.ts#L104`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L104),
   [`reports-query.service.ts#L119`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L119).

3. `Report API -> XLSX Builder, registry` (metadata и проверка report code):
   [`reports-query.service.ts#L49`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L49),
   [`reports-query.service.ts#L69`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L69),
   [`report-registry.ts#L70`](../libs/report-platform/registry/src/report-registry.ts#L70),
   [`report-registry.ts#L58`](../libs/report-platform/registry/src/report-registry.ts#L58).

4. `Report API -> Repos & External API` (тенанты/оргструктура/shared settings):
   [`reports-query.service.ts#L90`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L90),
   [`reports-query.service.ts#L106`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L106),
   [`reports-query.service.ts#L129`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L129).

## Сценарий 3. Запуск отчета

1. `Frontend -> Report API` (`POST /reports/:reportCode/launch`):
   [`useStep2LaunchActions.ts#L44`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2LaunchActions.ts#L44),
   [`reportApi.ts#L149`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L149),
   [`reports.controller.ts#L88`](../apps/report-api/src/reports.controller.ts#L88).

2. `Report API -> Service Layer` (`ReportsLaunchService`):
   [`reports.controller.ts#L96`](../apps/report-api/src/reports.controller.ts#L96),
   [`reports-launch.service.ts#L24`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L24),
   [`reports-launch.service.ts#L53`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L53),
   [`reports-launch.service.ts#L65`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L65).

3. `Service Layer -> Async Runtime` (старт раннера и запуск worker):
   [`report-instance.runner.ts#L145`](../apps/report-api/src/report-instance.runner.ts#L145),
   [`report-instance.runner.ts#L161`](../apps/report-api/src/report-instance.runner.ts#L161),
   [`report-instance.runner.ts#L203`](../apps/report-api/src/report-instance.runner.ts#L203),
   [`report-instance.worker.ts#L43`](../apps/report-api/src/report-instance.worker.ts#L43).

4. `Worker -> XLSX Builder, registry` (создание registry и launch в definition):
   [`report-registry.factory.ts#L51`](../apps/report-api/src/report-registry.factory.ts#L51),
   [`report-launch.executor.ts#L24`](../apps/report-api/src/report-launch.executor.ts#L24),
   [`report-launch.executor.ts#L43`](../apps/report-api/src/report-launch.executor.ts#L43).

5. `XLSX Builder, registry -> Report Definitions`:
   [`report-registry.factory.ts#L37`](../apps/report-api/src/report-registry.factory.ts#L37),
   [`report-registry.factory.ts#L43`](../apps/report-api/src/report-registry.factory.ts#L43),
   [`simple-sales-summary.definition.ts#L53`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.definition.ts#L53),
   [`simple-sales-summary-xlsx.definition.ts#L73`](../libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.definition.ts#L73).

6. `Report Definitions -> Repos & External API`:
   [`simple-sales-summary.definition.ts#L58`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.definition.ts#L58),
   [`simple-sales-summary.source.ts#L99`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts#L99),
   [`simple-sales-summary.source.ts#L136`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts#L136),
   [`simple-sales-summary.source.ts#L137`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts#L137),
   [`simple-sales-summary.source.ts#L138`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts#L138),
   [`simple-sales-summary-xlsx.source.ts#L58`](../libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.source.ts#L58),
   [`simple-sales-summary-xlsx.source.ts#L59`](../libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.source.ts#L59),
   [`external-client.factory.ts#L21`](../libs/report-platform/external-api/src/external-client.factory.ts#L21),
   [`open-weather.client.ts#L88`](../libs/report-platform/external-api/src/open-weather.client.ts#L88),
   [`execute-with-resilience.ts#L79`](../libs/report-platform/external-api/src/execute-with-resilience.ts#L79).

7. `Report Definitions -> XLSX Builder, registry` (построение XLSX):
   [`simple-sales-summary.service.ts#L43`](../libs/report-definitions/simple-sales-summary/src/simple-sales-summary.service.ts#L43),
   [`simple-sales-summary-xlsx.definition.ts#L88`](../libs/report-definitions/simple-sales-summary-xlsx/src/simple-sales-summary-xlsx.definition.ts#L88),
   [`template-runtime.ts#L172`](../libs/report-platform/xlsx/src/template-runtime.ts#L172).

## Сценарий 4. Прогресс и получение результата

1. `Frontend -> Report API` (polling статуса):
   [`Step3RunProgressContainer.tsx#L123`](../apps/report-web/src/features/report-launcher-runtime/containers/Step3RunProgressContainer.tsx#L123),
   [`reportApi.ts#L164`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L164),
   [`report-runs.controller.ts#L10`](../apps/report-api/src/report-runs.controller.ts#L10),
   [`report-runs-query.service.ts#L15`](../apps/report-api/src/modules/report-runs/services/report-runs-query.service.ts#L15).

2. `Frontend -> Report API` (получение текущего результата и истории инстансов):
   [`Step4ResultContainer.tsx#L27`](../apps/report-web/src/features/report-launcher-runtime/containers/Step4ResultContainer.tsx#L27),
   [`Step4ResultContainer.tsx#L32`](../apps/report-web/src/features/report-launcher-runtime/containers/Step4ResultContainer.tsx#L32),
   [`reportApi.ts#L164`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L164),
   [`reportApi.ts#L177`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L177),
   [`reports.controller.ts#L110`](../apps/report-api/src/reports.controller.ts#L110),
   [`reports-query.service.ts#L132`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L132).

3. `Frontend -> Report API` (скачивание файла по `downloadUrl`):
   [`Step4ResultContainer.tsx#L82`](../apps/report-web/src/features/report-launcher-runtime/containers/Step4ResultContainer.tsx#L82),
   [`Step4ResultCard.tsx#L62`](../apps/report-web/src/features/report-launcher-story/components/Step4ResultCard.tsx#L62),
   [`ReportInstanceList.tsx#L157`](../apps/report-web/src/features/report-launcher-story/components/ReportInstanceList.tsx#L157),
   [`reports.controller.ts#L120`](../apps/report-api/src/reports.controller.ts#L120),
   [`generated-files.service.ts#L15`](../apps/report-api/src/modules/reports/services/generated-files.service.ts#L15).
