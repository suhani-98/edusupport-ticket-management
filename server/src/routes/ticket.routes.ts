import { Router } from "express";
import {
  assignTicketController,
  changePriorityController,
  changeStatusController,
  createTicket,
  getTicket,
  listActivitiesController,
  listTicketController,
} from "../controllers/ticket.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const ticketRouter = Router();

ticketRouter.use(requireAuth);
ticketRouter.post("/", requireRole("student"), createTicket);
ticketRouter.get("/", listTicketController);
ticketRouter.patch("/:id/assignment", requireRole("manager"), assignTicketController);
ticketRouter.patch("/:id/status", requireRole("staff", "manager"), changeStatusController);
ticketRouter.patch("/:id/priority", requireRole("staff", "manager"), changePriorityController);
ticketRouter.get("/:id/activities", listActivitiesController);
ticketRouter.get("/:id", getTicket);
