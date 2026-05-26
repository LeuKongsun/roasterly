import { createHash, randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export function createAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, getAccessTokenSecret(), {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    jwtid: randomUUID()
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, getAccessTokenSecret());

  if (typeof payload === "string" || typeof payload.sub !== "string") {
    return null;
  }

  return payload;
}

export function createRefreshToken() {
  return randomBytes(64).toString("base64url");
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createRefreshTokenExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_DAYS);
  return expiresAt;
}

function getAccessTokenSecret() {
  if (!env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is required");
  }

  return env.JWT_ACCESS_SECRET;
}

