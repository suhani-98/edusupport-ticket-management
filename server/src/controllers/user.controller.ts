import type { Request, Response } from "express";
import { listActiveStaff } from "../services/user.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listStaffController = asyncHandler(async (_req: Request, res: Response) => {
  const users = await listActiveStaff();
  sendSuccess(res, { users });
});
