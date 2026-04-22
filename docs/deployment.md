# Deployment Guide (VPS / Oracle)

Документ описывает production-развертывание проекта через Docker Compose, GHCR и GitHub Actions.

## 1. Что используется

- `docker-compose.prod.yml` — production compose для `reverse-proxy + api + web + redis`.
- `docker/Caddyfile` — reverse proxy (Caddy) с автоматическим TLS.
- `.env.production` (server-side) — runtime-переменные сервера.
- GHCR образы:
  - `ghcr.io/<owner>/reporter-api:<tag>`
  - `ghcr.io/<owner>/reporter-web:<tag>`

## 2. GitHub Actions workflows

- `ci.yml` — quality gate на `push main` и `pull_request`.
- `docker-images.yml` — build/push образов на `push main`.
- `deploy.yml` — deploy:
  - автоматически после успешного `docker-images.yml`;
  - вручную через `workflow_dispatch` с выбором `image_tag`.

## 3. Required GitHub Secrets

Нужно добавить в `Settings -> Secrets and variables -> Actions`:

- `SSH_HOST` — IP/домен VPS.
- `SSH_PORT` — SSH порт (обычно `22`).
- `SSH_USER` — пользователь для деплоя.
- `SSH_PRIVATE_KEY` — приватный ключ для SSH.
- `DEPLOY_PATH` — путь deployment-директории на сервере (например `/opt/reporter`).
- `GHCR_USERNAME` — GitHub username/org для `docker login ghcr.io` на сервере.
- `GHCR_TOKEN` — PAT с минимум `read:packages`.

## 4. Первичная подготовка VPS

Пример для Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker "$USER"
```

После этого перелогиньтесь в SSH-сессию.

## 5. Первичная подготовка deployment директории

```bash
mkdir -p /opt/reporter/docker
cd /opt/reporter
```

Скопируйте в `/opt/reporter`:

- `docker-compose.prod.yml`
- `docker/Caddyfile`

Затем создайте `.env.production` по шаблону `.env.production.example`.

Минимально проверьте, что заданы:

- `DOMAIN`
- `CADDY_EMAIL`
- `API_IMAGE`
- `WEB_IMAGE`
- `API_CORS_ORIGINS`
- `REDIS_HOST`/`REDIS_PORT`
- `GENERATED_REPORTS_DIR`

## 6. GHCR login на сервере

```bash
echo "<GHCR_TOKEN>" | docker login ghcr.io -u "<GHCR_USERNAME>" --password-stdin
```

Если образы приватные, без этого шага `docker compose pull` не сможет их скачать.

## 7. Первый production запуск

```bash
cd /opt/reporter
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans
```

Проверка:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f --tail=100
curl -fsS https://<your-domain>/health
```

## 8. Как работает авто-deploy

`deploy.yml` делает на сервере:

1. загрузку актуальных `docker-compose.prod.yml` и `docker/Caddyfile`;
2. `docker login ghcr.io`;
3. `docker compose pull`;
4. `docker compose up -d --remove-orphans`.

Идемпотентность:

- повторный запуск workflow безопасен;
- локальная сборка образов на сервере не используется;
- применяются уже опубликованные теги из GHCR.

## 9. Ручной update / redeploy

Вариант A (рекомендуется): запустить `Deploy` workflow вручную и указать `image_tag`:

- `latest`
- или конкретный `sha-<full-commit-sha>`.

Вариант B (на сервере вручную):

1. Изменить `API_IMAGE` и `WEB_IMAGE` в `.env.production`.
2. Выполнить:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans
```

## 10. Rollback strategy

Базовый rollback без пересборки:

1. Выбрать предыдущий стабильный тег `sha-...`.
2. Задеплоить его через ручной `Deploy` workflow (`image_tag=sha-...`) либо прописать его в `.env.production`.
3. Выполнить `docker compose pull && docker compose up -d --remove-orphans`.

Это возвращает приложение к предыдущей версии, используя уже существующие образы в GHCR.

## 11. Где хранятся данные в production

- Generated reports: named volume `generated_reports` (монтируется в `/var/lib/reporter/generated-reports` внутри API).
- Redis data: named volume `redis_data`.
- Caddy TLS state: `caddy_data` и `caddy_config`.

## 12. Базовые health-check команды после деплоя

```bash
curl -fsS https://<your-domain>/health
curl -fsSI https://<your-domain>/
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T redis redis-cli ping
```
