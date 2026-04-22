FROM node:22-bookworm

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

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
  apt-get clean; \
  rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
