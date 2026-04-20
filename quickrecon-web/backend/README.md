# Backend

The backend is a Node.js + Express API that handles authentication, scan lifecycle management, secure file access, zip export, and execution of `backend/scripts/recon.sh`.

## Responsibilities

- Register/login users with JWT auth
- Validate apex-domain scan targets
- Run `recon.sh` with argument arrays only
- Store scan metadata in SQLite
- Save scan output folders under `storage/scans/`
- Let authenticated users browse only their own scan files and logs
- Export a saved scan folder as a zip

## Structure

```text
backend/
├── package.json
├── scripts/
│   └── recon.sh
└── src/
    ├── auth.js
    ├── config.js
    ├── db.js
    ├── scans.js
    ├── server.js
    ├── storage.js
    └── targets.js
```

## Local development

```bash
cd backend
npm install
export QUICKRECON_JWT_SECRET="replace-this-with-a-long-random-secret"
npm run dev
```

The API listens on `http://127.0.0.1:3001`.

## Security notes

- No `shell=True`
- No string-built shell commands
- `spawn()` is used with argument arrays only
- Targets must be apex domains like `example.com`
- File access is constrained to each scan's storage directory
- Every scan query is scoped to the authenticated user
- Log/file previews are served as plain text

## Production

For production-style use after the frontend has been built:

```bash
cd backend
npm install
npm start
```

The backend serves `frontend/dist` automatically when that folder exists.

## Docker

From the project root:

```bash
cp .env.example .env
docker compose up --build
```

Or build/run manually:

```bash
docker build -t quickrecon-web .
docker run --rm -p 3001:3001 \
  -e QUICKRECON_JWT_SECRET="replace-this-with-a-long-random-secret" \
  quickrecon-web
```

The Docker image now installs the recon toolchain needed by `recon.sh`, based on the provided `install.sh` workflow.
