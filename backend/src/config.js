import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const backendDir = path.resolve(currentDir, "..");
const projectDir = path.resolve(backendDir, "..");

export const config = {
  backendDir,
  projectDir,
  port: Number.parseInt(process.env.PORT ?? "3001", 10),
  jwtSecret:
    process.env.QUICKRECON_JWT_SECRET ??
    "change-me-in-production-quickrecon-node-secret",
  tokenTtlSeconds: 60 * 60 * 12,
  corsOrigins: ["http://127.0.0.1:5173", "http://localhost:5173"],
  storageDir: path.join(projectDir, "storage"),
  scansDir: path.join(projectDir, "storage", "scans"),
  exportsDir: path.join(projectDir, "storage", "exports"),
  databasePath: path.join(projectDir, "storage", "quickrecon.db"),
  reconScriptPath: path.join(backendDir, "scripts", "recon.sh"),
  frontendDistDir: path.join(projectDir, "frontend", "dist"),
};

export function ensureDirectories() {
  fs.mkdirSync(config.storageDir, { recursive: true });
  fs.mkdirSync(config.scansDir, { recursive: true });
  fs.mkdirSync(config.exportsDir, { recursive: true });
}
