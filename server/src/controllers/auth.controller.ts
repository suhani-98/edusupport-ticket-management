import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { login, registerStudent } from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toPublicUser } from "../utils/publicUser.js";
import { validateLoginBody, validateRegisterBody } from "../validators/auth.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = validateRegisterBody(req.body);
  const user = await registerStudent(input);
  sendSuccess(res, { user }, 201);
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const input = validateLoginBody(req.body);
  const result = await login(input);
  sendSuccess(res, result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.auth?.userId);
  if (!user) {
    throw new AppError(401, "INVALID_TOKEN", "Authentication token is invalid or expired.");
  }
  sendSuccess(res, { user: toPublicUser(user) });
});
