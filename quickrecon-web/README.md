# QuickRecon Web

QuickRecon Web is a structured MVP for running and reviewing recon scans through a React frontend and Node.js backend. It keeps scan data per user, stores results in dedicated output folders, lets users browse/export saved scans, and wraps the existing `recon.sh` workflow behind a safer web interface.

## Project layout

```text
quickrecon-web/
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── README.md
├── docker/
│   └── install-tools.sh
├── docker-compose.yml
├── backend/
│   ├── README.md
│   ├── package.json
│   ├── scripts/
│   │   └── recon.sh
│   └── src/
├── frontend/
│   ├── README.md
│   ├── package.json
│   ├── src/
│   └── vite.config.ts
├── nginx/
│   └── nginx.conf
└── storage/
    ├── exports/
    └── scans/
```

## Features

- JWT auth with per-user scan ownership
- Saved scan dashboard and scan detail views
- Apex-domain-only scan submission
- Secure scan execution through `recon.sh -d <domain> -o <scan-folder>`
- File browser, log viewer, and zip export
- Black-and-white dark/light theme UI
- Root nginx config for forwarding traffic to local frontend/backend ports
- Docker option based on Ubuntu 24.04

## Security notes

- No `shell=True`
- No string-built shell commands
- Backend runs the recon script with argument arrays only
- Targets must be apex domains like `example.com`
- Path traversal is blocked when serving files
- Users can access only their own scans
- File/log content is rendered as plain text in the UI, not injected as HTML

## Local development

1. Start the backend:

```bash
cd backend
npm install
export QUICKRECON_JWT_SECRET="replace-this-with-a-long-random-secret"
npm run dev
```

2. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

3. Open the app:

- Frontend: `http://127.0.0.1:5173`
- Backend health: `http://127.0.0.1:3001/health`

## Scan storage behavior

When a user creates a scan for `example.com`, the backend creates a user-owned output folder and runs:

```bash
bash backend/scripts/recon.sh -d example.com -o storage/scans/user-<user_id>/<scan_id>
```

That output folder is the source of truth for:

- the in-app file browser
- the in-app log viewer
- the exported zip download

## Nginx

The root nginx config lives in `nginx/nginx.conf`. It is set up to:

- forward `/api` and `/health` to the backend on `127.0.0.1:3001`
- forward all other traffic to the frontend dev server on `127.0.0.1:5173`
- support WebSocket upgrade headers for local Vite development

## Docker

The included Docker setup uses `ubuntu:24.04`, bundles the Node app, and installs the recon tooling needed by `recon.sh`.

### Easiest option

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- App: `http://127.0.0.1:3001`

The first build takes longer than a normal web app image because it installs the recon dependencies from the included Docker tools installer.

### Build

```bash
docker build -t quickrecon-web .
```

### Run

```bash
docker run --rm -p 3001:3001 \
  -e QUICKRECON_JWT_SECRET="replace-this-with-a-long-random-secret" \
  quickrecon-web
```

Then open:

- App/API container: `http://127.0.0.1:3001`

Notes:

- `docker-compose.yml` is the easiest way for users to start the app.
- The Docker image builds the frontend, runs the Node backend, and installs the recon binaries used by `recon.sh`.
- Container data is persisted through the host-mounted `storage/` directory in Docker Compose.
- The Docker tools installer is adapted from the provided `/Users/archie/Desktop/quick-recon/install.sh`.

## Recon script notes

The integrated copy of `recon.sh` includes a few important fixes from the original script:

- `subjs.txt` is now written and read consistently
- LinkFinder activation is guarded instead of hard-failing on a hardcoded venv path
- duplicated `httpx` flags were removed
- empty-subfinder output is handled more gracefully
