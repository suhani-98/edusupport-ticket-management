import { Router } from "express";
import { databaseStatus } from "../config/database.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  sendSuccess(res, {
    message: "EduSupport API is running",
    database: databaseStatus(),
  });
});
