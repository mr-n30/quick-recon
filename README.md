# QuickRecon Web

QuickRecon Web is a resume-ready MVP that wraps an existing recon workflow in a React frontend and Node.js backend with per-user isolation, JWT auth, SQLite persistence, secure file serving, zip export, and a monochrome dark/light UI.

## Folder structure

```text
quickrecon-web/
├── backend/
│   ├── src/
│   │   ├── auth.js
│   │   ├── config.js
│   │   ├── db.js
│   │   ├── scans.js
│   │   ├── server.js
│   │   ├── storage.js
│   │   └── targets.js
│   ├── scripts/
│   │   └── recon.sh
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── styles/
│   ├── package.json
│   └── vite.config.ts
├── storage/
│   ├── exports/
│   └── scans/
└── README.md
```

## Features

- Username/password auth with JWT bearer tokens
- Dashboard of saved recon scans per user
- New scan submission for an apex domain only
- Secure backend scan execution using `spawn()` with argument arrays only
- Persistent scan logs and artifact storage
- Scan detail page with file browser and log viewer
- Zip export for a single scan
- Per-user access control on scan records and files
- Persisted dark and light modes with a black-and-white visual system

## Security notes

- No `shell=True`
- No string-built shell commands
- Backend only launches the recon script with `spawn()` argument arrays
- Targets must be apex domains like `example.com`; URLs and subdomains are rejected
- File reads are constrained to the owning scan directory to block path traversal
- Scan queries are always filtered by the authenticated user
- Scan previews are rendered as inert text in React, not injected as HTML

## `recon.sh` review and fixes

The original script at `/Users/archie/Desktop/quick-recon/recon.sh` was reviewed before integration. The app-owned copy in `backend/scripts/recon.sh` includes these obvious fixes:

- It now writes JavaScript URLs to `subjs.txt`, which matches what the LinkFinder loop reads. The original script wrote `subjs-tmp.txt` but then tried to consume `subjs.txt`.
- It no longer blindly `source`s a hardcoded LinkFinder virtualenv path. Instead, it checks whether the LinkFinder script and venv Python exist, falls back to `python3` when possible, and skips LinkFinder cleanly if it is unavailable.
- It removes duplicated `httpx` flags and handles the empty-subfinder case without crashing later steps.

## Backend setup

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Set a JWT secret for production-like use:

```bash
export QUICKRECON_JWT_SECRET="replace-this-with-a-long-random-secret"
```

3. Start the API server:

```bash
npm run dev
```

The backend listens on `http://127.0.0.1:3001`.

When a scan is created, the backend stores it in a user-owned folder and runs:

```bash
bash backend/scripts/recon.sh -d example.com -o storage/scans/user-<user_id>/<scan_id>
```

The same folder is what the user can browse in the web UI or export as a zip.

## Frontend setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the React dev server:

```bash
npm run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:3001`.

## Production-style frontend build

Build the frontend and let the Node backend serve the generated files:

```bash
cd frontend
npm install
npm run build
cd ../backend
npm install
npm start
```

## Recon tool prerequisites

The integrated script expects these tools to be installed and on `PATH`:

- `subfinder`
- `httpx`
- `waybackurls`
- `gau`
- `hakrawler`
- `subjs`

Optional:

- `/opt/tools/linkfinder/linkfinder.py`
- `/opt/tools/linkfinder/venv/bin/python`

## Key API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/scans`
- `POST /api/scans`
- `GET /api/scans/{scan_id}`
- `GET /api/scans/{scan_id}/log`
- `GET /api/scans/{scan_id}/files/content?path=<relative-file>`
- `GET /api/scans/{scan_id}/export`

## Storage layout

- SQLite database: `storage/quickrecon.db`
- Scan outputs: `storage/scans/user-<user_id>/<scan_id>/`
- Zip exports: `storage/exports/user-<user_id>/<scan_id>.zip`

## Notes

- Scan targets must already be apex domains such as `example.com`.
- This MVP uses in-process background scan execution, which is simple and works well for a single-instance deployment.
- If you want multi-worker production execution later, the scan runner can be moved to a queue worker without changing the frontend contract.
