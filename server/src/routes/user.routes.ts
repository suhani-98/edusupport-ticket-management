import { Router } from "express";
import { listStaffController } from "../controllers/user.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const userRouter = Router();

userRouter.use(requireAuth);
userRouter.get("/staff", requireRole("manager"), listStaffController);
