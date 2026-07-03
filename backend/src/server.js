import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import cors from "cors";
import express from "express";

import {
  createAccessToken,
  hashPassword,
  requireAuth,
  validateCredentials,
  verifyPassword,
} from "./auth.js";
import { config, ensureDirectories } from "./config.js";
import { db } from "./db.js";
import { getOwnedScan, logPathFor, queueScan, scanDirectoryFor } from "./scans.js";
import {
  LOG_PREVIEW_LIMIT,
  TEXT_PREVIEW_LIMIT,
  buildFileTree,
  createScanZip,
  ensureWithinDirectory,
  readTextPreview,
} from "./storage.js";
import { normalizeTarget } from "./targets.js";

ensureDirectories();

const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS."));
    },
    credentials: true,
  }),
);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
});
app.use(express.json({ limit: "16kb" }));

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function toPublicUser(user) {
  return { id: user.id, username: user.username };
}

function sanitizeFilename(value) {
  return value.replace(/[^a-z0-9.-]+/gi, "-");
}

function validateRequestedPath(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 255) {
    const error = new Error("File path is required.");
    error.statusCode = 400;
    throw error;
  }
  return value;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post(
  "/api/auth/register",
  asyncRoute(async (req, res) => {
    const { username, password } = req.body ?? {};
    validateCredentials(username, password);

    const existingUser = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);

    if (existingUser) {
      const error = new Error("Username is already taken.");
      error.statusCode = 400;
      throw error;
    }

    const createdAt = new Date().toISOString();
    const result = db
      .prepare(
        "INSERT INTO users (username, hashed_password, created_at) VALUES (?, ?, ?)",
      )
      .run(username, hashPassword(password), createdAt);

    const createdUser = {
      id: Number(result.lastInsertRowid),
      username,
    };

    res.status(201).json({
      access_token: createAccessToken(createdUser.id),
      token_type: "bearer",
      user: createdUser,
    });
  }),
);

app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const { username, password } = req.body ?? {};
    validateCredentials(username, password);

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username);

    if (!user || !verifyPassword(password, user.hashed_password)) {
      const error = new Error("Invalid username or password.");
      error.statusCode = 401;
      throw error;
    }

    res.json({
      access_token: createAccessToken(user.id),
      token_type: "bearer",
      user: toPublicUser(user),
    });
  }),
);

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json(req.user);
});

app.get("/api/scans", requireAuth, (req, res) => {
  const scans = db
    .prepare("SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);

  res.json(scans);
});

app.post(
  "/api/scans",
  requireAuth,
  asyncRoute(async (req, res) => {
    const normalizedTarget = normalizeTarget(req.body?.target);
    const scanId = randomUUID();
    const now = new Date().toISOString();
    const storagePath = `user-${req.user.id}/${scanId}`;
    const logPath = "scan.log";

    const scan = {
      id: scanId,
      user_id: req.user.id,
      target_raw: String(req.body.target ?? "").trim(),
      normalized_target: normalizedTarget,
      status: "queued",
      storage_path: storagePath,
      log_path: logPath,
      last_error: null,
      created_at: now,
      started_at: null,
      finished_at: null,
    };

    db.prepare(
      `
        INSERT INTO scans (
          id, user_id, target_raw, normalized_target, status, storage_path,
          log_path, last_error, created_at, started_at, finished_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      scan.id,
      scan.user_id,
      scan.target_raw,
      scan.normalized_target,
      scan.status,
      scan.storage_path,
      scan.log_path,
      scan.last_error,
      scan.created_at,
      scan.started_at,
      scan.finished_at,
    );

    const scanDir = scanDirectoryFor(scan);
    await fs.promises.mkdir(scanDir, { recursive: true });
    await fs.promises.writeFile(
      logPathFor(scan),
      `[${now}] Scan queued for ${scan.normalized_target}\n`,
      "utf8",
    );

    queueScan(scan.id);
    res.status(201).json(scan);
  }),
);

app.get(
  "/api/scans/:scanId",
  requireAuth,
  asyncRoute(async (req, res) => {
    const scan = getOwnedScan(req.params.scanId, req.user.id);
    res.json({
      ...scan,
      files: buildFileTree(scanDirectoryFor(scan)),
    });
  }),
);

app.get(
  "/api/scans/:scanId/log",
  requireAuth,
  asyncRoute(async (req, res) => {
    const scan = getOwnedScan(req.params.scanId, req.user.id);
    const logPath = logPathFor(scan);

    if (!fs.existsSync(logPath)) {
      res.json({ content: "", truncated: false });
      return;
    }

    res.json(readTextPreview(logPath, LOG_PREVIEW_LIMIT));
  }),
);

app.get(
  "/api/scans/:scanId/files/content",
  requireAuth,
  asyncRoute(async (req, res) => {
    const scan = getOwnedScan(req.params.scanId, req.user.id);
    const requestedPath = validateRequestedPath(req.query.path);

    const filePath = ensureWithinDirectory(scanDirectoryFor(scan), requestedPath);
    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat?.isFile()) {
      const error = new Error("File not found.");
      error.statusCode = 404;
      throw error;
    }

    const preview = readTextPreview(filePath, TEXT_PREVIEW_LIMIT);
    res.json({
      path: requestedPath,
      ...preview,
    });
  }),
);

app.get(
  "/api/scans/:scanId/export",
  requireAuth,
  asyncRoute(async (req, res) => {
    const scan = getOwnedScan(req.params.scanId, req.user.id);
    const scanDir = scanDirectoryFor(scan);
    const stat = await fs.promises.stat(scanDir).catch(() => null);

    if (!stat?.isDirectory()) {
      const error = new Error("Scan output not found.");
      error.statusCode = 404;
      throw error;
    }

    const exportPath = path.join(config.exportsDir, `user-${req.user.id}`, `${scan.id}.zip`);
    await createScanZip(scanDir, exportPath);

    res.download(
      exportPath,
      `quickrecon-${sanitizeFilename(scan.normalized_target)}-${scan.id}.zip`,
    );
  }),
);

if (fs.existsSync(config.frontendDistDir)) {
  app.use(express.static(config.frontendDistDir));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") {
      next();
      return;
    }

    res.sendFile(path.join(config.frontendDistDir, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode ?? error.status ?? 500;
  const detail = statusCode >= 500 ? "Internal server error." : error.message;
  res.status(statusCode).json({ detail });
});

app.listen(config.port, () => {
  console.log(`QuickRecon Web backend listening on http://127.0.0.1:${config.port}`);
});
