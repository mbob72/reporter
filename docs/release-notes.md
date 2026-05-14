# Release Notes

## 2026-05-13

### Summary

Релиз выравнивает auth и transport слой между frontend/backend после перехода `report-api` на JWT-only flow: добавлен demo bootstrap endpoint для токена, фронт перешел на Bearer заголовок, а документация обновлена с точными ссылками на строки кода.

### Main Changes

- `report-api`: добавлен `POST /auth/dev-token` (public, dev-only) для выдачи JWT по `mockUserId`.
- `report-web`: удалена отправка `x-mock-user`; добавлен bootstrap токена и `Authorization: Bearer ...` для business-запросов.
- `docs/*`: актуализированы call-chain/worker/presentation/module документы и поправлены устаревшие ссылки на строки.

### Architecture Notes

- Runtime call-chain: [report-runtime-call-chain.md](./report-runtime-call-chain.md).
- Worker startup chain: [report-worker-startup-flow.md](./report-worker-startup-flow.md).
- Модульная структура `report-api`: [report-api-modules.md](./report-api-modules.md).

## 2026-04-29

### Summary

Релиз переводит runtime запуска отчетов на типизированные launch params и разводит Step2 UI по явным формам на каждый отчетный код. За счет этого фронт и бэкенд синхронизированы по единому контракту параметров запуска, а серверная валидация выполняется через `launchParamsSchema` конкретного definition. Дополнительно актуализирована архитектурная документация и гайд по добавлению нового отчета.

### Main Changes

- Frontend: Step2 стал report-specific (`reportStep2Registry`, отдельные формы и локальная zod-валидация).
- Report API: добавлена валидация launch params через `reportDefinition.launchParamsSchema`.
- Report Definitions + Registry: `ReportDefinition` стал generic по launch params, схемы параметров централизованы в `libs/report-platform/contracts/src/reports`.

### Architecture Notes

- Разбор изменений по блокам: [frontend-backend-block-separation.md](./frontend-backend-block-separation.md).
- Актуальная цепочка вызовов между блоками: [report-runtime-call-chain.md](./report-runtime-call-chain.md).
- Каноническая архитектура: [../ARCHITECTURE.md](../ARCHITECTURE.md).
