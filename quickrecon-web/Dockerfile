FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    GOPATH=/root/go \
    PATH=/root/go/bin:$PATH

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY docker/install-tools.sh /tmp/install-tools.sh

RUN chmod +x /tmp/install-tools.sh \
    && /tmp/install-tools.sh \
    && rm -f /tmp/install-tools.sh

COPY backend/package*.json /app/backend/
COPY frontend/package*.json /app/frontend/

RUN cd /app/backend && npm install \
    && cd /app/frontend && npm install

COPY . /app

RUN cd /app/frontend && npm run build

ENV NODE_ENV=production \
    PORT=3001 \
    QUICKRECON_JWT_SECRET=change-me-in-production

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -f http://127.0.0.1:3001/health || exit 1

WORKDIR /app/backend

CMD ["npm", "start"]
