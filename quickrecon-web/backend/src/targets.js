import { parse } from "tldts";

export function normalizeTarget(rawTarget) {
  const value = String(rawTarget ?? "").trim();
  if (!value) {
    const error = new Error("Target is required.");
    error.statusCode = 400;
    throw error;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.includes("://") ||
    value.includes("/") ||
    value.includes("\\") ||
    value.includes("@")
  ) {
    const error = new Error("Target must be an apex domain like example.com.");
    error.statusCode = 400;
    throw error;
  }

  const hostname = value.replace(/\.+$/, "").toLowerCase();
  const parsed = parse(hostname, { allowPrivateDomains: true });

  if (!parsed.domain || !parsed.publicSuffix || !parsed.hostname) {
    const error = new Error("Target must be a valid apex domain like example.com.");
    error.statusCode = 400;
    throw error;
  }

  if (parsed.hostname !== parsed.domain) {
    const error = new Error(
      `Target must be the apex domain only. Use ${parsed.domain} instead.`,
    );
    error.statusCode = 400;
    throw error;
  }

  return parsed.domain;
}
