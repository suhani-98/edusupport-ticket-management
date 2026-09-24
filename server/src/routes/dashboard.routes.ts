import { Router } from "express";
import {
  managerDashboardController,
  staffDashboardController,
  studentDashboardController,
} from "../controllers/dashboard.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get("/student", requireRole("student"), studentDashboardController);
dashboardRouter.get("/staff", requireRole("staff"), staffDashboardController);
dashboardRouter.get("/manager", requireRole("manager"), managerDashboardController);
