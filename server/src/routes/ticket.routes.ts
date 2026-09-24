import { Router } from "express";
import {
  addCommentController,
  assignTicketController,
  changePriorityController,
  changeStatusController,
  closeTicketController,
  createTicket,
  getTicket,
  listActivitiesController,
  listCommentsController,
  listTicketController,
  reopenTicketController,
  resolveTicketController,
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
ticketRouter.post("/:id/comments", addCommentController);
ticketRouter.get("/:id/comments", listCommentsController);
ticketRouter.post("/:id/resolve", requireRole("staff", "manager"), resolveTicketController);
ticketRouter.post("/:id/close", requireRole("student", "manager"), closeTicketController);
ticketRouter.post("/:id/reopen", requireRole("student", "manager"), reopenTicketController);
ticketRouter.get("/:id", getTicket);
