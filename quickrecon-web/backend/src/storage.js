import fs from "node:fs";
import path from "node:path";

import archiver from "archiver";

export const TEXT_PREVIEW_LIMIT = 1024 * 1024;
export const LOG_PREVIEW_LIMIT = 512 * 1024;

export function ensureWithinDirectory(baseDir, relativePath) {
  const cleaned = String(relativePath ?? "").trim().replace(/^\/+/, "");
  const candidate = path.resolve(baseDir, cleaned);
  const root = path.resolve(baseDir);

  if (!candidate.startsWith(`${root}${path.sep}`) && candidate !== root) {
    const error = new Error("Invalid file path.");
    error.statusCode = 400;
    throw error;
  }

  return candidate;
}

export function buildFileTree(baseDir, rootDir = baseDir) {
  if (!fs.existsSync(baseDir)) {
    return [];
  }

  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    })
    .map((entry) => {
      const absolutePath = path.join(baseDir, entry.name);
      const relative = path.relative(rootDir, absolutePath).split(path.sep).join("/");

      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: relative,
          type: "directory",
          children: buildFileTree(absolutePath, rootDir),
        };
      }

      return {
        name: entry.name,
        path: relative,
        type: "file",
        size: fs.statSync(absolutePath).size,
      };
    });
}

export function readTextPreview(filePath, limit) {
  const fileHandle = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(limit + 1);
    const bytesRead = fs.readSync(fileHandle, buffer, 0, limit + 1, 0);
    const truncated = bytesRead > limit;
    return {
      content: buffer.subarray(0, Math.min(bytesRead, limit)).toString("utf8"),
      truncated,
    };
  } finally {
    fs.closeSync(fileHandle);
  }
}

export async function createScanZip(sourceDir, destinationZip) {
  await fs.promises.mkdir(path.dirname(destinationZip), { recursive: true });

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destinationZip);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });

  return destinationZip;
}
