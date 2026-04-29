# Report Platform (Nx Monorepo)

Платформа для асинхронного запуска отчетов с tenant-aware доступом к данным и выдачей файловых артефактов отчетов.

## Где читать в первую очередь

- [ARCHITECTURE.md](./ARCHITECTURE.md) - основной архитектурный документ (source of truth).
- [docs/how-to-add-report.md](./docs/how-to-add-report.md) - пошаговая инструкция добавления нового отчета.
- [docs/report-runtime-call-chain.md](./docs/report-runtime-call-chain.md) - сценарии вызовов между архитектурными блоками.
- [docs/frontend-backend-block-separation.md](./docs/frontend-backend-block-separation.md) - изменения по блокам Frontend/Backend.
- [docs/release-notes.md](./docs/release-notes.md) - журнал релизных изменений.
- [docs/deployment.md](./docs/deployment.md) - deploy-контур и ограничения текущего CI/CD.
- [docs/external-dependency-resilience.md](./docs/external-dependency-resilience.md) - retries/fallback для внешних API.

## Запуск проекта

### 1. Локально (без Docker)

```bash
pnpm install
pnpm start:api
pnpm start:web
```

По умолчанию:

- API: `http://localhost:3000`
- Web: `http://localhost:4200`
- Health: `GET http://localhost:3000/health`

### 2. Docker Dev (основной режим разработки)

```bash
pnpm dev:docker
```

Сервисы:

- Web: `http://localhost:4200`
- API: `http://localhost:3000`
- Redis: `localhost:6379`

Полезные команды:

- `pnpm dev:docker:attach`
- `pnpm dev:docker:logs`
- `pnpm dev:docker:down`

### 3. Docker Preview (prod-like локальный smoke)

```bash
pnpm preview:docker
```

Сервисы:

- Web: `http://localhost:4200`
- API: `http://localhost:3000`
- Redis: `localhost:6379`

Полезные команды:

- `pnpm preview:docker:attach`
- `pnpm preview:docker:logs`
- `pnpm preview:docker:down`

Быстрый smoke:

```bash
curl -fsS http://localhost:3000/health
curl -fsSI http://localhost:4200
```

### 4. Текущий production deploy (WIP)

Production-контур уже есть, но еще не завершен до production-grade.

Основные файлы:

- `docker-compose.prod.yml`
- `docker/Caddyfile`
- `.env.production` (создается по `.env.production.example`)

Ручной первый запуск на сервере:

```bash
cd /opt/reporter
docker login ghcr.io -u "<GHCR_USERNAME>"
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans
```

Проверка:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -fsS https://<your-domain>/health
curl -fsSI https://<your-domain>/
```

Детальный гайд: [docs/deployment.md](./docs/deployment.md).

## CI/CD

В репозитории настроены GitHub Actions workflows:

1. `CI` (`.github/workflows/ci.yml`)

- Триггеры: `pull_request`, `push` в `main`.
- Шаги: `format:check -> lint -> typecheck -> test -> build`.

2. `Docker Images` (`.github/workflows/docker-images.yml`)

- Триггер: `push` в `main`.
- Собирает и публикует образы в GHCR:
  - `ghcr.io/<owner>/reporter-api`
  - `ghcr.io/<owner>/reporter-web`
- Теги:
  - `latest` (для default branch)
  - `sha-<full-commit-sha>`.

3. `Deploy` (`.github/workflows/deploy.yml`)

- Триггеры:
  - автоматически после успешного `Docker Images`;
  - вручную через `workflow_dispatch` (`image_tag`).
- Выполняет на VPS:
  - upload deployment файлов;
  - `docker login ghcr.io`;
  - `docker compose pull`;
  - `docker compose up -d --remove-orphans`.

Required GitHub Secrets для deploy:

- `SSH_HOST`
- `SSH_PORT`
- `SSH_USER`
- `SSH_PRIVATE_KEY`
- `DEPLOY_PATH`
- `GHCR_USERNAME`
- `GHCR_TOKEN`

## Текущая runtime-модель отчетов

1. `POST /reports/:reportCode/launch` -> backend сразу возвращает `{ reportInstanceId, status: 'queued' }`.
2. Асинхронная генерация выполняется во fork worker.
3. UI поллит `GET /report-runs/:reportInstanceId`.
4. По завершению артефакт доступен через `GET /generated-files/:fileId`.
5. История запусков по коду отчета: `GET /reports/:reportCode/instances`.
6. Политики `critical/non-critical`, retry и fallback для внешних зависимостей: [docs/external-dependency-resilience.md](./docs/external-dependency-resilience.md).

## Legacy API термины

- `jobId` -> `reportInstanceId`
- `GET /report-jobs/:jobId` -> `GET /report-runs/:reportInstanceId`
- in-memory job store -> filesystem-backed instance store (`meta.json` + `artifact.bin`)

## Хранилище артефактов

`GENERATED_REPORTS_DIR`:

- локально по умолчанию: `.generated-reports`
- в каждой директории instance:
  - `meta.json`
  - `artifact.bin`

Структура:

```text
{GENERATED_REPORTS_DIR}/{reportCode}/{reportInstanceId}/
```

## Основные команды качества

- `pnpm lint`
- `pnpm lint:fix`
- `pnpm format`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`

Короткий backend-only цикл (если менялись только `libs/report-platform/data-access/src/**`):

```bash
pnpm nx run-many -t lint,typecheck,test,build --projects=report-api --parallel=1
```

## Структура репозитория

```text
apps/
  report-api/
  report-web/

libs/
  report-platform/
    contracts/
    auth/
    data-access/
    external-api/
    registry/
    xlsx/
  report-definitions/
    simple-sales-summary/
    simple-sales-summary-xlsx/

docs/
  deployment.md
  external-dependency-resilience.md
  frontend-backend-block-separation.md
  how-to-add-report.md
  release-notes.md
  report-runtime-call-chain.md
```

## Важные ограничения текущей версии

- Async запуск реализован через fork worker внутри API процесса.
- Репозитории доступа к данным пока mock-реализации.
- CI/CD контур есть, но не доведен до production-grade.

Подробный roadmap и принятые решения: [ARCHITECTURE.md](./ARCHITECTURE.md).
