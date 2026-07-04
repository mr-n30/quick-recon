# syntax=docker/dockerfile:1.7

ARG NODE_BUILD_IMAGE=node:22.23.1-bookworm
ARG NODE_RUNTIME_IMAGE=node:22.23.1-bookworm-slim
ARG GO_IMAGE=golang:1.26.4-bookworm

FROM ${NODE_BUILD_IMAGE} AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend/ ./
RUN npm run build

FROM ${NODE_BUILD_IMAGE} AS backend-dependencies
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM ${GO_IMAGE} AS recon-tools
ARG SUBFINDER_VERSION=v2.14.0
ARG HTTPX_VERSION=v1.9.0
ARG WAYBACKURLS_VERSION=89da10c
ARG GAU_VERSION=v2.2.4
ARG HAKRAWLER_VERSION=7615255
ARG SUBJS_VERSION=3eb4dc9

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOBIN=/out go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@${SUBFINDER_VERSION} \
    && CGO_ENABLED=0 GOBIN=/out go install github.com/projectdiscovery/httpx/cmd/httpx@${HTTPX_VERSION} \
    && CGO_ENABLED=0 GOBIN=/out go install github.com/tomnomnom/waybackurls@${WAYBACKURLS_VERSION} \
    && CGO_ENABLED=0 GOBIN=/out go install github.com/lc/gau/v2/cmd/gau@${GAU_VERSION} \
    && CGO_ENABLED=0 GOBIN=/out go install github.com/hakluke/hakrawler@${HAKRAWLER_VERSION} \
    && CGO_ENABLED=0 GOBIN=/out go install github.com/lc/subjs@${SUBJS_VERSION}

FROM debian:bookworm-slim AS linkfinder-source
ARG LINKFINDER_VERSION=1debac5
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && mkdir -p /out \
    && curl --fail --location --show-error --silent \
      "https://github.com/GerbenJavado/LinkFinder/archive/${LINKFINDER_VERSION}.tar.gz" \
      | tar --extract --gzip --strip-components=1 --directory=/out \
    && test -f /out/linkfinder.py \
    && rm -rf /var/lib/apt/lists/*

FROM ${NODE_RUNTIME_IMAGE} AS runtime

LABEL org.opencontainers.image.title="QuickRecon Web" \
      org.opencontainers.image.description="Containerized web interface for isolated domain reconnaissance scans" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production \
    PORT=3001 \
    HOME=/tmp \
    XDG_CONFIG_HOME=/tmp/.config \
    XDG_CACHE_HOME=/tmp/.cache

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      bash \
      ca-certificates \
      python3 \
      python3-jsbeautifier \
      tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=recon-tools /out/ /usr/local/bin/
COPY --from=linkfinder-source /out/ /opt/tools/linkfinder/
COPY --chmod=755 docker/linkfinder /usr/local/bin/linkfinder
COPY --from=backend-dependencies --chown=node:node /build/backend/node_modules/ backend/node_modules/
COPY --chown=node:node backend/package.json backend/package-lock.json backend/
COPY --chown=node:node backend/src/ backend/src/
COPY --chown=node:node backend/scripts/ backend/scripts/
COPY --from=frontend-build --chown=node:node /build/frontend/dist/ frontend/dist/

RUN mkdir -p storage/scans storage/exports \
    && chown -R node:node /app/storage \
    && chmod +x backend/scripts/recon.sh

USER node

EXPOSE 3001
VOLUME ["/app/storage"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "backend/src/server.js"]
