import { AppError } from "../utils/AppError.js";
import { userRoles, type UserRole } from "../models/User.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", `${field} is required.`);
  }
  return value.trim();
}

export function assertPasswordStrength(password: string): void {
  const longEnough = password.length >= 8 && password.length <= 72;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (!longEnough || !hasLetter || !hasNumber) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Password must be 8 to 72 characters and include a letter and a number.",
    );
  }
}

export function validateRegisterBody(body: unknown): { name: string; email: string; password: string } {
  if (body === null || typeof body !== "object") {
    throw new AppError(400, "VALIDATION_ERROR", "Request body is required.");
  }
  const record = body as Record<string, unknown>;
  if (record.role !== undefined) {
    const requested = String(record.role);
    if (!userRoles.includes(requested as UserRole) || requested !== "student") {
      throw new AppError(403, "FORBIDDEN", "Registration can only create student accounts.");
    }
  }
  const name = requiredString(record.name, "Name");
  if (name.length < 2 || name.length > 80) {
    throw new AppError(400, "VALIDATION_ERROR", "Name must be between 2 and 80 characters.");
  }
  const email = requiredString(record.email, "Email").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new AppError(400, "VALIDATION_ERROR", "Email is not valid.");
  }
  const password = requiredString(record.password, "Password");
  assertPasswordStrength(password);
  return { name, email, password };
}

export function validateLoginBody(body: unknown): { email: string; password: string } {
  if (body === null || typeof body !== "object") {
    throw new AppError(400, "VALIDATION_ERROR", "Request body is required.");
  }
  const record = body as Record<string, unknown>;
  const email = requiredString(record.email, "Email").toLowerCase();
  const password = requiredString(record.password, "Password");
  return { email, password };
}
