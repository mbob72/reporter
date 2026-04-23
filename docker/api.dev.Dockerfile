FROM node:22-bookworm

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
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

WORKDIR /workspace
