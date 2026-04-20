import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import { config } from "./config.js";
import { db } from "./db.js";

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,50}$/;

export function validateCredentials(username, password) {
  if (!USERNAME_RE.test(username ?? "")) {
    const error = new Error(
      "Username must be 3-50 characters and use letters, numbers, dots, dashes, or underscores.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    const error = new Error("Password must be between 8 and 128 characters.");
    error.statusCode = 400;
    throw error;
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const digest = crypto.pbkdf2Sync(password, salt, 390000, 32, "sha256");
  return `${salt.toString("base64")}$${digest.toString("base64")}`;
}

export function verifyPassword(password, hashedPassword) {
  if (typeof hashedPassword !== "string" || !hashedPassword.includes("$")) {
    return false;
  }

  const [saltEncoded, digestEncoded] = hashedPassword.split("$", 2);
  const salt = Buffer.from(saltEncoded, "base64");
  const expectedDigest = Buffer.from(digestEncoded, "base64");
  const actualDigest = crypto.pbkdf2Sync(password, salt, 390000, 32, "sha256");
  if (expectedDigest.length !== actualDigest.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualDigest, expectedDigest);
}

export function createAccessToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.tokenTtlSeconds,
  });
}

export function requireAuth(req, _res, next) {
  try {
    const header = req.get("authorization");
    if (!header?.startsWith("Bearer ")) {
      const error = new Error("Authentication required.");
      error.statusCode = 401;
      throw error;
    }

    const token = header.slice("Bearer ".length);
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    const userId = Number.parseInt(payload.sub, 10);
    if (!Number.isInteger(userId)) {
      const error = new Error("Invalid or expired token.");
      error.statusCode = 401;
      throw error;
    }

    const user = db
      .prepare("SELECT id, username FROM users WHERE id = ?")
      .get(userId);

    if (!user) {
      const error = new Error("User no longer exists.");
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    const authError = new Error("Invalid or expired token.");
    authError.statusCode = 401;
    next(error.statusCode ? error : authError);
  }
}
