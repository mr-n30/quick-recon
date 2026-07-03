# QuickRecon Web

QuickRecon Web provides a React interface and Node.js API for running and reviewing domain reconnaissance scans. It includes JWT authentication, per-user scan isolation, SQLite persistence, live logs, artifact browsing, ZIP exports, and dark/light themes.

Only scan domains you own or have explicit permission to test.

## Features

- Authenticated, per-user scan history
- Apex-domain validation
- Background scan execution with live logs
- Safe text previews for generated artifacts
- ZIP export for scan results
- Path traversal and cross-user access protection

## Install reconnaissance tools

The installers update system packages and write tools to `/opt/tools` and `/usr/local/bin`. Review them before running.

### Ubuntu 24.04 and Debian-based systems

```bash
sudo ./install-ubuntu.sh
```

### Arch Linux

```bash
sudo ./install-arch.sh
```

### BlackArch

Follow the official [BlackArch installation instructions](https://blackarch.org/downloads.html), then run the Arch installer above if any QuickRecon dependencies are missing.

## Run the web app

Use Node.js 22 LTS.

Start the backend:

```bash
cd backend
npm install
export QUICKRECON_JWT_SECRET="replace-with-a-long-random-secret"
npm run dev
```

In a second terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The frontend proxies API requests to the backend at `http://127.0.0.1:3001`.

## Production-style build

```bash
cd frontend
npm install
npm run build
cd ../backend
npm install
npm start
```

The backend serves the built frontend when `frontend/dist` exists.

## Recon dependencies

The scan workflow requires these commands on `PATH`:

- `subfinder`
- `httpx`
- `waybackurls`
- `gau`
- `hakrawler`
- `subjs`

LinkFinder is optional and is detected under `/opt/tools/linkfinder`.

## Storage

- Database: `storage/quickrecon.db`
- Scan results: `storage/scans/user-<user_id>/<scan_id>/`
- ZIP exports: `storage/exports/user-<user_id>/<scan_id>.zip`

Scan jobs run inside the API process. Use a dedicated queue worker before deploying multiple backend instances.
