# Report Runtime Call Chain

Ниже актуальный call-chain для `report-api` после перехода на единый HTTP pipeline: `requestId middleware -> JWT guard -> Zod pipes -> thin controllers -> services -> global exception filter`.

## 1. Глобальный HTTP pipeline (для всех business endpoint-ов)

1. `requestId` middleware добавляет/пробрасывает `x-request-id`:
   [`request-id.middleware.ts#L13`](../apps/report-api/src/common/middleware/request-id.middleware.ts#L13)

2. JWT guard проверяет `Authorization: Bearer <token>`, валидирует claims как `CurrentUser` и кладёт в `request.user`:
   [`jwt-auth.guard.ts#L21`](../apps/report-api/src/common/auth/jwt-auth.guard.ts#L21),
   [`jwt-auth.guard.ts#L47`](../apps/report-api/src/common/auth/jwt-auth.guard.ts#L47),
   [`jwt-auth.guard.ts#L57`](../apps/report-api/src/common/auth/jwt-auth.guard.ts#L57)

3. `@CurrentUser()` читает пользователя из `request.user`:
   [`current-user.decorator.ts#L9`](../apps/report-api/src/common/auth/current-user.decorator.ts#L9)

4. Route-level `ZodValidationPipe` валидирует `@Param/@Body` и отдаёт `400 VALIDATION_ERROR`:
   [`zod-validation.pipe.ts#L5`](../apps/report-api/src/common/pipes/zod-validation.pipe.ts#L5)

5. Controller остаётся thin и делегирует в service:
   [`reports.controller.ts#L19`](../apps/report-api/src/reports.controller.ts#L19),
   [`report-runs.controller.ts#L7`](../apps/report-api/src/report-runs.controller.ts#L7)

6. Global exception filter маппит доменные ошибки и unknown:
   [`api-exception.filter.ts#L33`](../apps/report-api/src/common/filters/api-exception.filter.ts#L33)

7. Global interceptor пишет structured log (`method/path/status/latency/userId/requestId`):
   [`request-logging.interceptor.ts#L21`](../apps/report-api/src/common/interceptors/request-logging.interceptor.ts#L21)

8. Глобальная регистрация middleware/guard/filter/interceptor сделана в `AppModule`:
   [`app.module.ts#L15`](../apps/report-api/src/app.module.ts#L15),
   [`app.module.ts#L22`](../apps/report-api/src/app.module.ts#L22),
   [`app.module.ts#L37`](../apps/report-api/src/app.module.ts#L37)

## 2. Launch flow (`POST /reports/:reportCode/launch`)

1. Endpoint с `reportCode` param pipe, `body` pipe и `@CurrentUser()`:
   [`reports.controller.ts#L74`](../apps/report-api/src/reports.controller.ts#L74)

2. Контроллер делегирует в `ReportsLaunchService`:
   [`reports.controller.ts#L83`](../apps/report-api/src/reports.controller.ts#L83),
   [`reports-launch.service.ts#L19`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L19)

3. Service выполняет domain checks (`report exists`, `role access`, `launch params schema`) и запускает runner:
   [`reports-launch.service.ts#L20`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L20),
   [`reports-launch.service.ts#L31`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L31),
   [`reports-launch.service.ts#L38`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L38),
   [`reports-launch.service.ts#L47`](../apps/report-api/src/modules/reports/services/reports-launch.service.ts#L47)

4. Runner стартует async instance lifecycle:
   [`report-instance.runner.ts#L145`](../apps/report-api/src/report-instance.runner.ts#L145)

## 3. Read flows (`/reports`, `/metadata`, `/tenants`, `/organizations`, `/shared-settings`, `/instances`)

1. `ReportsController` endpoints:
   [`reports.controller.ts#L30`](../apps/report-api/src/reports.controller.ts#L30),
   [`reports.controller.ts#L36`](../apps/report-api/src/reports.controller.ts#L36),
   [`reports.controller.ts#L46`](../apps/report-api/src/reports.controller.ts#L46),
   [`reports.controller.ts#L58`](../apps/report-api/src/reports.controller.ts#L58),
   [`reports.controller.ts#L64`](../apps/report-api/src/reports.controller.ts#L64),
   [`reports.controller.ts#L86`](../apps/report-api/src/reports.controller.ts#L86)

2. Query service orchestrates registry/data-access/store:
   [`reports-query.service.ts#L21`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L21),
   [`reports-query.service.ts#L39`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L39),
   [`reports-query.service.ts#L57`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L57),
   [`reports-query.service.ts#L94`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L94),
   [`reports-query.service.ts#L104`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L104),
   [`reports-query.service.ts#L123`](../apps/report-api/src/modules/reports/services/reports-query.service.ts#L123)

## 4. Report-runs and file download flows

1. `GET /report-runs/:reportInstanceId`:
   [`report-runs.controller.ts#L14`](../apps/report-api/src/report-runs.controller.ts#L14),
   [`report-runs-query.service.ts#L14`](../apps/report-api/src/modules/report-runs/services/report-runs-query.service.ts#L14)

2. `GET /generated-files/:fileId`:
   [`reports.controller.ts#L95`](../apps/report-api/src/reports.controller.ts#L95),
   [`generated-files.service.ts#L10`](../apps/report-api/src/modules/reports/services/generated-files.service.ts#L10)

## 5. Public endpoints

`GET /health` отмечен как public (`@Public()`), не требует JWT:
[`health.controller.ts#L7`](../apps/report-api/src/health.controller.ts#L7)

`POST /auth/dev-token` тоже public и используется только для demo bootstrap JWT в `report-web`:
[`auth.controller.ts#L21`](../apps/report-api/src/auth.controller.ts#L21),
[`dev-auth.service.ts#L15`](../apps/report-api/src/modules/auth/services/dev-auth.service.ts#L15)
