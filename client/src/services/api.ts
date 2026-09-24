import { clearToken, getToken } from "../lib/token";
import type { ApiFailure, ApiSuccess } from "../types/api";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function isFailure(value: unknown): value is ApiFailure {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record = value as { success?: unknown; error?: { message?: unknown; code?: unknown } };
  return record.success === false && typeof record.error?.message === "string" && typeof record.error.code === "string";
}

function isSuccess<T>(value: unknown): value is ApiSuccess<T> {
  return value !== null && typeof value === "object" && (value as { success?: unknown }).success === true && "data" in value;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "The server could not be reached. Check that the API is running.");
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(response.status, "INVALID_RESPONSE", "The server returned an unexpected response.");
    }
  }

  if (!response.ok) {
    const message = isFailure(payload) ? payload.error.message : "The request could not be completed.";
    const code = isFailure(payload) ? payload.error.code : "REQUEST_FAILED";
    if (response.status === 401) {
      clearToken();
      onUnauthorized?.();
      const sessionMessage = code === "INVALID_CREDENTIALS" ? message : "Your session has expired. Please sign in again.";
      throw new ApiError(response.status, code, sessionMessage);
    }
    throw new ApiError(response.status, code, message);
  }

  if (!isSuccess<T>(payload)) {
    throw new ApiError(response.status, "INVALID_RESPONSE", "The server returned an unexpected response.");
  }
  return payload.data;
}
