import { apiRequest } from "./api";
import type { StaffUser } from "../types/ticket";

export function getAssignableStaff(): Promise<{ users: StaffUser[] }> {
  return apiRequest<{ users: StaffUser[] }>("/users/staff");
}
