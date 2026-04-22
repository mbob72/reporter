FROM node:22-bookworm AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm nx run report-web:build

FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.preview.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/report-web/dist/apps/report-web /usr/share/nginx/html

EXPOSE 4200
