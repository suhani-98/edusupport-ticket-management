import { apiRequest } from "./api";
import type { StudentDashboard } from "../types/ticket";

export function getStudentDashboard(): Promise<StudentDashboard> {
  return apiRequest<StudentDashboard>("/dashboard/student");
}
