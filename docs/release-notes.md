# Release Notes

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
