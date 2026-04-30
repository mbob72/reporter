# План Презентации Проекта Reports (20 минут)

Цель: показать текущий runtime продукта, архитектуру, принятые решения, инфраструктуру и эволюцию между `release-0.1` и `release-0.2`.

## Тайминг (строго 20:00)

| Время       | Длительность | Блок                                                                                   |
| ----------- | -----------: | -------------------------------------------------------------------------------------- |
| 00:00-02:30 |         2:30 | 1. Live-демо приложения + адаптивность фронта                                          |
| 02:30-05:00 |         2:30 | 2. Архитектурные блоки (обзор)                                                         |
| 05:00-08:00 |         3:00 | 3. Передача управления между блоками + runtime chain                                   |
| 08:00-10:00 |         2:00 | 4. Взаимодействие фронта с бэком (добавочный блок)                                     |
| 10:00-12:30 |         2:30 | 5. Инфраструктура: тесты, Storybook, Nx, CI/CD, quality gates                          |
| 12:30-15:30 |         3:00 | 6. Принятые решения и альтернативы                                                     |
| 15:30-18:00 |         2:30 | 7. Коммиты `release-0.1 -> release-0.2` и закрытие замечания про связность фронта/бэка |
| 18:00-20:00 |         2:00 | 8. Обзор документации и актуальности                                                   |

## 1) Live-Демо Приложения (2:30)

Что показать:

- Шаги `Step1 -> Step2 -> Step3 -> Step4`.
- Что UI восстанавливает состояние по URL/`reportInstanceId`.
- Что layout адаптивен (mobile/tablet/desktop).

Ссылки в коде:

- Shell/stepper и route-driven flow: [`apps/report-web/src/features/report-launcher-runtime/containers/ReportLaunchShell.tsx#L21`](../apps/report-web/src/features/report-launcher-runtime/containers/ReportLaunchShell.tsx#L21)
- Responsive отступы и контейнер: [`apps/report-web/src/features/report-launcher-runtime/containers/ReportLaunchShell.tsx#L26`](../apps/report-web/src/features/report-launcher-runtime/containers/ReportLaunchShell.tsx#L26)
- Responsive сетка Step1 (`grid-cols-1 -> md:grid-cols-2`): [`apps/report-web/src/features/report-launcher-story/components/Step1ReportSelectionCard.tsx#L120`](../apps/report-web/src/features/report-launcher-story/components/Step1ReportSelectionCard.tsx#L120)
- Responsive footer actions (`w-full sm:w-auto`): [`apps/report-web/src/features/report-launcher-story/components/Step1ReportSelectionCard.tsx#L277`](../apps/report-web/src/features/report-launcher-story/components/Step1ReportSelectionCard.tsx#L277), [`apps/report-web/src/features/report-launcher-story/components/Step4ResultCard.tsx#L83`](../apps/report-web/src/features/report-launcher-story/components/Step4ResultCard.tsx#L83)

## 2) Архитектурные Блоки (2:30)

Что рассказать:

- 5 runtime-блоков: `Frontend`, `Report API`, `Report Definitions`, `Repos & External API`, `XLSX Builder, registry`.
- Принцип execution context: контекст строит платформа, а не отчет.
- Границы ответственности платформы и отчета.

Если не раскрывать заново, использовать документ:

- Каноника: [`ARCHITECTURE.md`](../ARCHITECTURE.md)
- Раздел блоков: [`ARCHITECTURE.md#L51`](../ARCHITECTURE.md#L51)
- Контекст исполнения: [`ARCHITECTURE.md#L22`](../ARCHITECTURE.md#L22)
- Границы ответственности: [`ARCHITECTURE.md#L119`](../ARCHITECTURE.md#L119)

## 3) Передача Управления Между Блоками (3:00)

Что показать на одном сквозном сценарии:

- Открытие launcher страницы.
- Конфигурация (Step2).
- Launch отчета.
- Polling/результат/скачивание артефакта.

Если инфа уже в документации, использовать:

- Полная call-chain карта: [`docs/report-runtime-call-chain.md`](./report-runtime-call-chain.md)
- Worker startup chain (коротко, тех.деталь): [`docs/report-worker-startup-flow.md`](./report-worker-startup-flow.md)

Минимальные кодовые якоря для слайда:

- Launch endpoint: [`apps/report-api/src/reports.controller.ts#L194`](../apps/report-api/src/reports.controller.ts#L194)
- Runner -> worker fork: [`apps/report-api/src/report-instance.runner.ts#L203`](../apps/report-api/src/report-instance.runner.ts#L203)
- Worker entrypoint: [`apps/report-api/src/report-instance.worker.ts#L86`](../apps/report-api/src/report-instance.worker.ts#L86)
- Вызов definition launch: [`apps/report-api/src/report-launch.executor.ts#L43`](../apps/report-api/src/report-launch.executor.ts#L43)

## 4) Взаимодействие Frontend С Backend (дополнительно) (2:00)

Это отдельный блок (его действительно удобно подсветить отдельно от архитектуры).

Что проговорить:

- Фронт ходит в API через единый RTK Query слой.
- Сервер валидирует payload и `launchParamsSchema` конкретного report definition.
- После launch backend сразу отдает `queued + reportInstanceId`, далее фронт поллит статус и получает артефакт.

Ссылки в коде:

- API слой фронта (`listReports`, `metadata`, `launch`, `report-runs`, `instances`): [`apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L60`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L60)
- Front launch mutation: [`apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L144`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts#L144)
- Backend launch + server-side schema validation: [`apps/report-api/src/reports.controller.ts#L194`](../apps/report-api/src/reports.controller.ts#L194), [`apps/report-api/src/reports.controller.ts#L230`](../apps/report-api/src/reports.controller.ts#L230)
- Status endpoint: [`apps/report-api/src/report-runs.controller.ts#L27`](../apps/report-api/src/report-runs.controller.ts#L27)
- Download endpoint: [`apps/report-api/src/reports.controller.ts#L294`](../apps/report-api/src/reports.controller.ts#L294)

## 5) Инфраструктура Проекта (2:30)

Что рассказать:

- Unit tests.
- Storybook как UI-контур и для изолированной проверки компонентов.
- Nx orchestration команд.
- CI/CD pipeline и quality gates.
- Локальные quality-инструменты (pre-commit, lint-staged, eslint/prettier).

Ссылки:

- Пример unit-теста UI: [`apps/report-web/src/features/report-launcher-story/components/Step1ReportSelectionCard.spec.tsx#L44`](../apps/report-web/src/features/report-launcher-story/components/Step1ReportSelectionCard.spec.tsx#L44)
- Пример unit-теста API runtime: [`apps/report-api/src/report-launch.executor.spec.ts#L47`](../apps/report-api/src/report-launch.executor.spec.ts#L47)
- Storybook config: [`apps/report-web/.storybook/main.ts#L7`](../apps/report-web/.storybook/main.ts#L7), [`apps/report-web/.storybook/preview.tsx#L7`](../apps/report-web/.storybook/preview.tsx#L7)
- Story example: [`apps/report-web/src/features/report-launcher-story/Step1ReportSelectionCard.stories.tsx#L43`](../apps/report-web/src/features/report-launcher-story/Step1ReportSelectionCard.stories.tsx#L43)
- Nx/скрипты (`typecheck/build/test/validate`): [`package.json#L21`](../package.json#L21), [`package.json#L24`](../package.json#L24)
- Nx targets по приложениям: [`apps/report-api/project.json#L6`](../apps/report-api/project.json#L6), [`apps/report-web/project.json#L6`](../apps/report-web/project.json#L6)
- CI quality gate: [`.github/workflows/ci.yml#L14`](../.github/workflows/ci.yml#L14)
- Docker images workflow: [`.github/workflows/docker-images.yml#L17`](../.github/workflows/docker-images.yml#L17)
- Deploy workflow: [`.github/workflows/deploy.yml#L21`](../.github/workflows/deploy.yml#L21)
- Pre-commit quality: [`.husky/pre-commit#L4`](../.husky/pre-commit#L4), [`.lintstagedrc.json#L2`](../.lintstagedrc.json#L2), [`eslint.config.mjs#L7`](../eslint.config.mjs#L7)

## 6) Принятые Решения И Альтернативы (3:00)

Брать напрямую из канонического раздела:

- [`ARCHITECTURE.md` раздел 3](../ARCHITECTURE.md#L258)

Рекомендуемая подача (по 25-35 сек на пункт):

- `reportInstanceId` как единая сущность запуска (альтернатива: dual-модель/синхронный launch).
- XLSX template как часть модели отчета (альтернатива: перенос формул в TS).
- Repository boundary + mock adapters (альтернатива: прямые SQL/ORM из definition).
- Async через fork worker (альтернатива: sync HTTP или сразу distributed queue).
- FS persistence `meta.json + artifact.bin` (альтернатива: сразу DB + object storage).
- Retry стратегии по критичности внешних зависимостей (альтернатива: единая жесткая политика).

## 7) Коммиты `release-0.1 -> release-0.2` И Закрытие Замечания (2:30)

Факты по релизам:

- `release-0.1`: `cd2f45e` (дата коммита: `2026-04-23`).
- `release-0.2`: `7b958fe` (дата коммита: `2026-04-29`).
- Между тегами: 5 коммитов.

Ключевой для замечания "фронт знает о бэке":

- `7f097ae refactor(reports): typed launch params and explicit Step2 forms`.
- Разбор этого изменения: [`docs/frontend-backend-block-separation.md`](./frontend-backend-block-separation.md)
- Где видно инъекцию report-specific формы по `reportCode`:
  - [`apps/report-web/src/features/report-launcher-runtime/containers/Step2LaunchConfigurationContainer.tsx#L35`](../apps/report-web/src/features/report-launcher-runtime/containers/Step2LaunchConfigurationContainer.tsx#L35)
  - [`apps/report-web/src/features/report-launcher-runtime/containers/step2/reportStep2Registry.ts#L9`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/reportStep2Registry.ts#L9)
  - [`apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2LaunchConfigurationViewModel.ts#L249`](../apps/report-web/src/features/report-launcher-runtime/containers/step2/hooks/useStep2LaunchConfigurationViewModel.ts#L249)
- Где видно server-side выравнивание контракта: [`apps/report-api/src/reports.controller.ts#L230`](../apps/report-api/src/reports.controller.ts#L230)

## 8) Обзор Документации И Актуальности (2:00)

Быстрый обзор (по 5-8 секунд на документ):

- Каноника архитектуры: [`ARCHITECTURE.md`](../ARCHITECTURE.md) (указано состояние на `2026-04-29`, см. статус документа).
- Роутинг/runtime-сценарии блоков: [`docs/report-runtime-call-chain.md`](./report-runtime-call-chain.md).
- Запуск worker процесса: [`docs/report-worker-startup-flow.md`](./report-worker-startup-flow.md).
- Разделение frontend/backend по блочным изменениям: [`docs/frontend-backend-block-separation.md`](./frontend-backend-block-separation.md).
- Добавление нового отчета: [`docs/how-to-add-report.md`](./how-to-add-report.md).
- Resilience внешних зависимостей: [`docs/external-dependency-resilience.md`](./external-dependency-resilience.md).
- Релизные изменения: [`docs/release-notes.md`](./release-notes.md).
- CI/CD и ограничения прод-контура: [`docs/deployment.md`](./deployment.md).
- Точка входа по документации: [`README.md`](../README.md).

---

## Подготовка Перед Выступлением (опционально, 5 минут до старта)

- Открыть локально 3 файла заранее: `ARCHITECTURE.md`, `docs/report-runtime-call-chain.md`, `docs/frontend-backend-block-separation.md`.
- Поднять `report-web` и `report-api`, чтобы не тратить время на запуск во время демо.
- Держать `Step2LaunchConfigurationContainer.tsx` и `reports.controller.ts` открытыми для блока про frontend/backend контракт.
