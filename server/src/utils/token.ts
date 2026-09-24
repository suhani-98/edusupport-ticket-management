import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRole } from "../models/User.js";

const TOKEN_TTL = "8h";

export type AccessTokenPayload = {
  userId: string;
  role: UserRole;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === "string" || !decoded.userId || !decoded.role) {
    throw new Error("Invalid access token");
  }
  return { userId: String(decoded.userId), role: decoded.role as UserRole };
}
