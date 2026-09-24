import type { NextFunction, Request, Response } from "express";
import { User, type UserRole } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/token.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "MISSING_TOKEN", "Authentication is required."));
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    next(new AppError(401, "MISSING_TOKEN", "Authentication is required."));
    return;
  }

  let userId: string;
  try {
    userId = verifyAccessToken(token).userId;
  } catch {
    next(new AppError(401, "INVALID_TOKEN", "Authentication token is invalid or expired."));
    return;
  }

  const user = await User.findById(userId).select("role isActive");
  if (!user || !user.isActive) {
    next(new AppError(401, "INVALID_TOKEN", "Authentication token is invalid or expired."));
    return;
  }

  req.auth = { userId: user.id, role: user.role as UserRole };
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AppError(401, "MISSING_TOKEN", "Authentication is required."));
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(new AppError(403, "FORBIDDEN", "You do not have permission to perform this action."));
      return;
    }
    next();
  };
}
