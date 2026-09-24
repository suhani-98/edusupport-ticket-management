import type { Request, Response } from "express";
import { listCategories } from "../services/category.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listCategoriesController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) {
    throw new AppError(401, "MISSING_TOKEN", "Authentication is required.");
  }
  const categories = await listCategories(req.auth.role);
  sendSuccess(res, { categories });
});
