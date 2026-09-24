import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

function isInvalidJson(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    "status" in error &&
    (error as { status?: number }).status === 400 &&
    "type" in error &&
    (error as { type?: string }).type === "entity.parse.failed"
  );
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (isInvalidJson(error)) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON.",
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong.",
    },
  });
}
