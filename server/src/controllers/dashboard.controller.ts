import type { Request, Response } from "express";
import { managerDashboard, staffDashboard, studentDashboard } from "../services/dashboard.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function actor(req: Request) {
  if (!req.auth) {
    throw new AppError(401, "MISSING_TOKEN", "Authentication is required.");
  }
  return req.auth;
}

export const studentDashboardController = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await studentDashboard(actor(req).userId));
});

export const staffDashboardController = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await staffDashboard(actor(req).userId));
});

export const managerDashboardController = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await managerDashboard());
});
