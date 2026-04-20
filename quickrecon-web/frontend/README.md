# Frontend

The frontend is a React + Vite UI for QuickRecon Web. It provides login/register flows, a saved scan dashboard, apex-domain scan creation, file browsing, log preview, zip export, and a monochrome light/dark theme toggle.

## Structure

```text
frontend/
├── index.html
├── package.json
├── src/
│   ├── api/
│   ├── components/
│   ├── pages/
│   ├── styles/
│   └── vite-env.d.ts
└── vite.config.ts
```

## Local development

```bash
cd frontend
npm install
npm run dev
```

The dev server listens on `http://127.0.0.1:5173` and proxies `/api` and `/health` to the backend at `http://127.0.0.1:3001`.

## Production build

```bash
cd frontend
npm install
npm run build
```

This writes static assets to `frontend/dist`, which the backend serves in production mode.

## UI behavior

- Users submit apex domains only, such as `example.com`
- Scan output is shown as plain text previews rather than rendered HTML
- The file browser only exposes files returned by the authenticated backend
- Dark/light mode is stored locally in the browser

## Docker

The root Docker setup builds the frontend automatically during image creation, so users can bring the whole app up from the project root with:

```bash
cp .env.example .env
docker compose up --build
```
