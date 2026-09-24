import { Router } from "express";
import { listCategoriesController } from "../controllers/category.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const categoryRouter = Router();

categoryRouter.use(requireAuth);
categoryRouter.get("/", listCategoriesController);
