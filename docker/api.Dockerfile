FROM node:22-bookworm AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm nx run report-api:build

FROM node:22-bookworm AS runtime

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3000
ENV GENERATED_REPORTS_DIR=/var/lib/reporter/generated-reports
ENV LIBREOFFICE_BINARY=/usr/bin/soffice

RUN corepack enable

RUN set -eux; \
  if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources; \
  fi; \
  apt-get update -o Acquire::Retries=5; \
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates \
    libreoffice-calc \
    libreoffice-core \
    fonts-dejavu; \
  command -v soffice; \
  soffice --headless --version; \
  tmp_dir="$(mktemp -d)"; \
  printf 'left,right\n1,2\n' > "${tmp_dir}/smoke.csv"; \
  soffice --headless --nologo --nodefault --norestore --nolockcheck \
    --convert-to xlsx --outdir "${tmp_dir}" "${tmp_dir}/smoke.csv"; \
  test -s "${tmp_dir}/smoke.xlsx"; \
  rm -rf "${tmp_dir}"; \
  apt-get clean; \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

COPY --from=builder /app/dist/out-tsc/report-api ./dist/out-tsc/report-api

RUN mkdir -p /var/lib/reporter/generated-reports

WORKDIR /app/dist/out-tsc/report-api

EXPOSE 3000

CMD ["node", "apps/report-api/src/main.js"]
