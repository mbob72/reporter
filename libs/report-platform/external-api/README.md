# `@report-platform/external-api`

## Верхние связи (кто использует)

### 1) API-приложение (`apps/report-api`)

- `apps/report-api/src/reporting.providers.ts`
  - Регистрирует DI-токены:
    - `SHARED_SETTINGS_PROVIDER_TOKEN` -> `MockSharedSettingsProvider`
    - `EXTERNAL_CLIENT_FACTORY_TOKEN` -> `ExternalClientFactory`
  - Через это подключает модуль к Nest-контейнеру.

- `apps/report-api/src/reports.controller.ts`
  - Инжектит `SharedSettingsProvider` по `SHARED_SETTINGS_PROVIDER_TOKEN`.
  - Использует `sharedSettingsProvider.listOptions(...)` в endpoint:
    - `GET /reports/:reportCode/external-services/:serviceKey/shared-settings`

- `apps/report-api/src/report-registry.factory.ts`
  - В non-Nest сборке создает:
    - `new MockSharedSettingsProvider()`
    - `new ExternalClientFactory(sharedSettingsProvider)`
  - Передает `ExternalClientFactory` в сборку реестра отчетов.

- `apps/report-api/src/reports.controller.spec.ts`
  - Использует `SharedSettingsProvider` как тип для моков контроллера.

### 2) Определение и запуск отчета `simple-sales-summary`

- `libs/report-definitions/simple-sales-summary/src/simple-sales-summary.definition.ts`
  - Принимает `ExternalClientFactory`.
  - В `launch(...)` вызывает `getOpenWeatherClient(...)`.

- `libs/report-definitions/simple-sales-summary/src/simple-sales-summary.source.ts`
  - Использует:
    - `OpenWeatherClient` (тип клиента погоды)
    - `executeWithResilience(...)`
    - `RetryStrategies.transientTwice`
  - Получает температуру через внешнее API с retry/fallback-логикой.

### 3) Конфигурация alias (разрешение импорта пакета)

- `apps/report-api/vite.aliases.ts`
- `apps/report-web/vite.aliases.ts`

Оба файла маппят `@report-platform/external-api` на
`libs/report-platform/external-api/src/index.ts`.

## Нижние связи (файлы директории и ответственность)

### Входная точка

- `src/index.ts`
  - Barrel-export всех публичных сущностей модуля.
  - Единая точка импорта для внешних потребителей.

### DI и контракты shared settings

- `src/tokens.ts`
  - Константы DI-токенов:
    - `SHARED_SETTINGS_PROVIDER_TOKEN`
    - `EXTERNAL_CLIENT_FACTORY_TOKEN`

- `src/shared-settings.provider.ts`
  - Контракт `SharedSettingsProvider`:
    - `listOptions(...)`
    - `resolveCredentials(...)`
  - Типы:
    - `SharedSettingOption`
    - `ResolvedSharedSettingCredentials`

- `src/shared-settings.provider.mock.ts`
  - In-memory реализация `SharedSettingsProvider`.
  - Дает список shared settings и резолвит API key по контексту пользователя/отчета.
  - Включает проверки доступа (`Admin`, `TenantAdmin`) и ошибки (`FORBIDDEN`, `NOT_FOUND`).

### Клиент внешнего сервиса и его фабрика

- `src/open-weather.client.ts`
  - Низкоуровневый HTTP-клиент OpenWeather:
    - Валидация координат и API key.
    - `fetch` с timeout через `AbortController`.
    - Проверка HTTP-статуса.
    - Валидация JSON-ответа через `zod`.
  - Любые сбои оборачиваются в `ExternalDependencyError` с категорией:
    - `invalid_input`, `network`, `timeout`, `http`, `invalid_response`.

- `src/external-client.factory.ts`
  - Фабрика доменных внешних клиентов.
  - Сейчас поддерживает `getOpenWeatherClient(...)`:
    - Проверяет, что отчет объявил зависимость `openWeather`.
    - Поддерживает режимы credentials:
      - `manual` (прямой API key из launch params)
      - `shared` (через `SharedSettingsProvider.resolveCredentials(...)`).

### Устойчивость и политика retry

- `src/external-dependency.error.ts`
  - Типизированная ошибка внешней зависимости:
    - `ExternalDependencyError`
    - `isExternalDependencyError(...)`
  - Хранит `serviceKey`, `category`, `httpStatus`, `cause`.

- `src/retry-strategies.ts`
  - Тип `RetryStrategy`.
  - Готовые профили:
    - `none`
    - `transientTwice`
    - `transientFiveWithBackoff`
  - Функция расчета задержки `getDelayBeforeAttempt(...)`.

- `src/execute-with-resilience.ts`
  - Обертка выполнения операций с retry/fallback:
    - Повторяет только retryable ошибки внешних зависимостей.
    - Retryable:
      - категории `network`, `timeout`
      - `http` со статусами `429` и `5xx` (кроме `400/401/403/404`)
    - Для `criticality: 'optional'` вызывает `fallback(...)` после исчерпания/неретраибельной ошибки.
    - Для `criticality: 'critical'` пробрасывает ошибку вверх.

## Короткий внутренний граф зависимостей

- `index.ts` -> экспортирует все файлы.
- `shared-settings.provider.mock.ts` -> `shared-settings.provider.ts`
- `external-client.factory.ts` -> `open-weather.client.ts`, `shared-settings.provider.ts`
- `open-weather.client.ts` -> `external-dependency.error.ts`
- `execute-with-resilience.ts` -> `external-dependency.error.ts`, `retry-strategies.ts`
