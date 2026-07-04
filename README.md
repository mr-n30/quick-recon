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

The Arch installer accepts `--source blackarch|auto|go`. The default, `blackarch`, requires the BlackArch repository and uses its packages when available. Tools missing from BlackArch fall back to their upstream Go modules. Use `--source auto` on plain Arch to use BlackArch when configured, or `--source go` to install directly from upstream:

```bash
sudo ./install-arch.sh --source blackarch
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

## Run with Docker

The production container builds the React frontend, installs production-only backend dependencies, compiles pinned recon tools, runs as a non-root user, and persists the SQLite database and scan results in a named volume.

Create the local environment file and replace the placeholder with a random secret:

```bash
cp .env.example .env
openssl rand -hex 32
```

Build and start the application:

```bash
docker compose up --build -d
docker compose ps
```

Open `http://127.0.0.1:3001`. Follow logs with `docker compose logs -f app` and stop the application with `docker compose down`. The `quickrecon-data` volume is retained; use `docker compose down --volumes` only when you intend to delete the database and scan results.

The image includes only tools invoked by the containerized scan workflow. The host installers include additional workstation utilities such as Nuclei and ffuf.

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

LinkFinder is optional and is detected either on `PATH` or under `/opt/tools/linkfinder`.

## Storage

- Database: `storage/quickrecon.db`
- Scan results: `storage/scans/user-<user_id>/<scan_id>/`
- ZIP exports: `storage/exports/user-<user_id>/<scan_id>.zip`

Scan jobs run inside the API process. Use a dedicated queue worker before deploying multiple backend instances.
