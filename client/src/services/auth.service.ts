import { apiRequest } from "./api";
import type { AuthUser } from "../types/auth";

export function loginRequest(email: string, password: string) {
  return apiRequest<{ token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function registerRequest(name: string, email: string, password: string) {
  return apiRequest<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function currentUserRequest() {
  return apiRequest<{ user: AuthUser }>("/auth/me");
}
