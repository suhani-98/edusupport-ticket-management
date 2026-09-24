import { apiRequest } from "./api";
import type { ManagerDashboard, StaffDashboard, StudentDashboard } from "../types/ticket";

export function getStudentDashboard(): Promise<StudentDashboard> {
  return apiRequest<StudentDashboard>("/dashboard/student");
}

export function getStaffDashboard(): Promise<StaffDashboard> {
  return apiRequest<StaffDashboard>("/dashboard/staff");
}

export function getManagerDashboard(): Promise<ManagerDashboard> {
  return apiRequest<ManagerDashboard>("/dashboard/manager");
}
