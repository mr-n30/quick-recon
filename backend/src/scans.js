import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { config } from "./config.js";
import { db } from "./db.js";

export function scanDirectoryFor(scan) {
  return path.join(config.scansDir, scan.storage_path);
}

export function logPathFor(scan) {
  return path.join(scanDirectoryFor(scan), scan.log_path);
}

export function getOwnedScan(scanId, userId) {
  const scan = db
    .prepare("SELECT * FROM scans WHERE id = ? AND user_id = ?")
    .get(scanId, userId);

  if (!scan) {
    const error = new Error("Scan not found.");
    error.statusCode = 404;
    throw error;
  }

  return scan;
}

export function queueScan(scanId) {
  setImmediate(() => {
    runScanJob(scanId);
  });
}

export function runScanJob(scanId) {
  const scan = db.prepare("SELECT * FROM scans WHERE id = ?").get(scanId);
  if (!scan) {
    return;
  }

  const scanDir = scanDirectoryFor(scan);
  const logPath = logPathFor(scan);
  fs.mkdirSync(scanDir, { recursive: true });

  db.prepare(
    `
      UPDATE scans
      SET status = 'running', started_at = ?, last_error = NULL
      WHERE id = ?
    `,
  ).run(new Date().toISOString(), scanId);

  const logStream = fs.createWriteStream(logPath, { flags: "a" });
  const writeLine = (line) => {
    logStream.write(`[${new Date().toISOString()}] ${line}\n`);
  };
  let settled = false;

  const finalize = (status, lastError) => {
    if (settled) {
      return;
    }
    settled = true;

    db.prepare(
      `
        UPDATE scans
        SET status = ?, finished_at = ?, last_error = ?
        WHERE id = ?
      `,
    ).run(status, new Date().toISOString(), lastError, scanId);
    logStream.end();
  };

  writeLine(`Starting scan for ${scan.normalized_target}`);

  const child = spawn(
    "bash",
    [config.reconScriptPath, "-d", scan.normalized_target, "-o", scanDir],
    {
      cwd: path.dirname(config.reconScriptPath),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => {
    logStream.write(chunk);
  });

  child.stderr.on("data", (chunk) => {
    logStream.write(chunk);
  });

  child.on("error", (error) => {
    writeLine(`Scan process failed to start: ${error.message}`);
    finalize("failed", error.message);
  });

  child.on("close", (code) => {
    writeLine(`Scan exited with code ${code ?? -1}`);
    finalize(
      code === 0 ? "completed" : "failed",
      code === 0 ? null : `Scan exited with status ${code ?? -1}.`,
    );
  });
}
