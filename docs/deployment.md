# Deployment Guide (VPS / Oracle)

Документ описывает текущий deploy-контур и его ограничения.

## 1. Статус

Сейчас в репозитории есть базовый CI/CD каркас:

- `ci.yml` - quality gate;
- `docker-images.yml` - build/push образов в GHCR;
- `deploy.yml` - выкладка на VPS по SSH.

Важно: это не полностью завершенный production CI/CD.

## 2. Что используется

- `docker-compose.prod.yml` - compose для `reverse-proxy + api + web + redis`.
- `docker/Caddyfile` - reverse proxy (Caddy) с TLS.
- `.env.production` - серверные переменные.
- GHCR образы:
  - `ghcr.io/<owner>/reporter-api:<tag>`
  - `ghcr.io/<owner>/reporter-web:<tag>`

## 3. Required GitHub Secrets

Добавить в `Settings -> Secrets and variables -> Actions`:

- `SSH_HOST`
- `SSH_PORT`
- `SSH_USER`
- `SSH_PRIVATE_KEY`
- `DEPLOY_PATH`
- `GHCR_USERNAME`
- `GHCR_TOKEN`

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

## 5. Подготовка deployment директории

```bash
mkdir -p /opt/reporter/docker
cd /opt/reporter
```

Скопировать в `/opt/reporter`:

- `docker-compose.prod.yml`
- `docker/Caddyfile`

Создать `.env.production` по шаблону `.env.production.example`.

## 6. Первый запуск

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

## 7. Как работает auto-deploy

`deploy.yml` делает на сервере:

1. обновление deployment файлов;
2. `docker login ghcr.io`;
3. `docker compose pull`;
4. `docker compose up -d --remove-orphans`.

Ручной deploy возможен через `workflow_dispatch` с `image_tag` (`latest` или `sha-...`).

## 8. Rollback

1. Выбрать предыдущий стабильный тег `sha-...`.
2. Запустить `Deploy` workflow с этим `image_tag`.
3. Проверить health и `docker compose ps`.

## 9. Что не закрыто для production

1. Полноценный release-process по окружениям (`dev/stage/prod`) с approval gates.
2. Автоматизированные post-deploy проверки и rollback policy по сигналам мониторинга.
3. Security gates в pipeline (SAST/SCA/container scan/SBOM).
4. Управление секретами production уровня (vault/secret manager, ротация).
5. Контур очередей для background jobs (RabbitMQ + BullMQ) и отдельные worker deployment units.
