import { Router } from "express";
import { loginController, me, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", loginController);
authRouter.get("/me", requireAuth, me);
