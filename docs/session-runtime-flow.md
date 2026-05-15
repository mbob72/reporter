# Session Runtime Flow

Документ описывает актуальное устройство сессии после изменений с `access + refresh token` и bootstrap-восстановлением.

## 1. Компоненты и ответственность

### Frontend

- Session state (`selectedMockUserId`, `accessToken`, `isBootstrapped`):
  [`sessionSlice.ts`](../apps/report-web/src/features/report-launcher-runtime/store/sessionSlice.ts)
- RTK Query + auto-refresh по `401`:
  [`reportApi.ts`](../apps/report-web/src/features/report-launcher-runtime/api/reportApi.ts)
- Bootstrap восстановления сессии на старте:
  [`SessionBootstrap.tsx`](../apps/report-web/src/app/providers/SessionBootstrap.tsx)
- Guard роутов (`/login` vs protected runtime routes):
  [`router.tsx`](../apps/report-web/src/app/router/router.tsx)
- Runtime shell и auth flow при смене пользователя:
  [`ReportLaunchShell.tsx`](../apps/report-web/src/features/report-launcher-runtime/containers/ReportLaunchShell.tsx)
- Экран логина (выбор mock user, пустая опция):
  [`LoginContainer.tsx`](../apps/report-web/src/features/report-launcher-runtime/containers/LoginContainer.tsx)

### Backend

- Auth endpoints (`/auth/dev-token`, `/auth/refresh`, `/auth/logout`), cookie setup, CSRF origin/referer check:
  [`auth.controller.ts`](../apps/report-api/src/auth.controller.ts)
- Issue/rotate/revoke session logic:
  [`dev-auth.service.ts`](../apps/report-api/src/modules/auth/services/dev-auth.service.ts)
- Refresh session storage (hash, revoke, replacement):
  [`refresh-session.store.ts`](../apps/report-api/src/modules/auth/services/refresh-session.store.ts)
- JWT runtime config (TTL, secrets, access/refresh split):
  [`jwt.config.ts`](../apps/report-api/src/common/auth/jwt.config.ts)
- Protected API guard (принимает только `type: access`):
  [`jwt-auth.guard.ts`](../apps/report-api/src/common/auth/jwt-auth.guard.ts)

## 2. TTL и токены

- `access token`: 1 минута (default)
- `refresh token`: 5 минут (default)
- refresh token хранится в `HttpOnly` cookie `report_refresh_token`
- access token хранится только в памяти фронта (Redux)

## 3. Поведение роутов на фронте

Источник: [`router.tsx`](../apps/report-web/src/app/router/router.tsx)

- `LoginLayout`:
  - если `selectedMockUserId` уже есть -> редирект на `/report-launch`
  - иначе рендер `/login`
- `ProtectedLayout`:
  - если `selectedMockUserId` отсутствует -> редирект на `/login`
  - иначе пускает в runtime-маршруты
- `*` всегда редиректит на `/login`

Важно: роутинг начинает работать только после bootstrap (`isBootstrapped=true`), пока он не завершен, показывается экран `Restoring session...`.

## 4. Кейсы

## 4.1 Логин и переключение пользователя

### Frontend flow

1. Пользователь открывает `/login`.
2. `LoginContainer` показывает селектор с пустой опцией `— Select user —`.
3. После выбора юзера и нажатия `Login`:
   - `dispatch(selectMockUser(mockUserId))`
   - `navigate('/report-launch')`
4. В `ReportLaunchShell` запускается auth flow:
   - если выбран новый пользователь относительно предыдущего: `clearSession` -> `logoutSession().unwrap()` -> `issueDevToken({ mockUserId }).unwrap()`
   - после успешного `issueDevToken` сохраняется `accessToken`.

### Backend flow

1. `POST /auth/logout` (если был прошлый пользователь):
   - `AuthController.logout`
   - `DevAuthService.revokeSession(refreshToken)`
   - cookie очищается.
2. `POST /auth/dev-token`:
   - `AuthController.issueDevToken`
   - `DevAuthService.issueDevToken(mockUserId)`
   - выдаются `accessToken`, `mockUserId`, ставится новый refresh cookie.

## 4.2 Истечение `access token` (авторизационного токена)

### Frontend flow

1. Любой защищенный API-запрос получает `401`.
2. `baseQueryWithReauth` в `reportApi.ts` автоматически вызывает `POST /auth/refresh`.
3. Если refresh успешен:
   - обновляются `selectedMockUserId` и `accessToken` в Redux
   - исходный API-запрос повторяется один раз.
4. Если refresh неуспешен:
   - `clearSession()`
   - роут-guard переводит пользователя на `/login`.

### Backend flow

1. Основной endpoint возвращает `401` (access token истек/некорректен), через `JwtAuthGuard`.
2. `POST /auth/refresh`:
   - `AuthController.refreshSession` (проверка trusted Origin/Referer)
   - чтение refresh cookie
   - `DevAuthService.refreshSession(refreshToken)`:
     - validate refresh token + store entry
     - rotate refresh token
     - revoke старую refresh сессию
     - выдать новый `accessToken` + `mockUserId`
   - set-cookie нового refresh token.

## 4.3 Истечение сессии (`refresh token`)

### Frontend flow

1. При очередном `401` фронт пытается `POST /auth/refresh`.
2. Refresh завершается ошибкой (`401`/`403`):
   - `clearSession()`
   - пользователь теряет auth state
   - `ProtectedLayout` редиректит на `/login`.

### Backend flow

1. `POST /auth/refresh`:
   - refresh token отсутствует/просрочен/отозван/невалиден
   - `DevAuthService.refreshSession(...)` возвращает `UNAUTHORIZED`
   - сессия не восстанавливается.

## 4.4 Refresh страницы (F5)

### Frontend flow

1. После перезагрузки in-memory Redux очищается.
2. До рендеринга роутера `SessionBootstrap` выполняет `refreshSession().unwrap()`.
3. Если refresh успешен:
   - восстанавливает `selectedMockUserId` + `accessToken`
   - ставит `isBootstrapped=true`
   - пользователь остается в защищенной зоне (если URL защищенный).
4. Если refresh неуспешен:
   - `clearSession()`
   - `isBootstrapped=true`
   - guard редиректит на `/login`.

### Backend flow

1. `POST /auth/refresh` работает как в секции 4.2.
2. При success возвращает новый `accessToken` и `mockUserId`, плюс новый refresh cookie.
3. При fail сессия считается завершенной.

## 5. Короткая сводка переходов состояния

- Есть валидный refresh cookie + истек access: автоматическое восстановление без участия пользователя.
- Истек refresh cookie: полный logout и переход на `/login`.
- F5 при валидном refresh: сессия восстанавливается в bootstrap.
- F5 при невалидном refresh: переход на `/login`.
