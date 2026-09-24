import { Router } from "express";
import {
  addCommentController,
  assignTicketController,
  changePriorityController,
  changeStatusController,
  closeTicketController,
  createTicket,
  escalateTicketController,
  getTicket,
  listActivitiesController,
  listCommentsController,
  listEscalationsController,
  listTicketController,
  refreshSlaController,
  reopenTicketController,
  resolveEscalationController,
  resolveTicketController,
  slaSummaryController,
} from "../controllers/ticket.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const ticketRouter = Router();

ticketRouter.use(requireAuth);
ticketRouter.post("/", requireRole("student"), createTicket);
ticketRouter.get("/sla-summary", requireRole("staff", "manager"), slaSummaryController);
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
ticketRouter.patch("/:id/sla/refresh", requireRole("staff", "manager"), refreshSlaController);
ticketRouter.post("/:id/escalate", requireRole("staff", "manager"), escalateTicketController);
ticketRouter.get("/:id/escalations", listEscalationsController);
ticketRouter.post(
  "/:id/escalations/:escalationId/resolve",
  requireRole("staff", "manager"),
  resolveEscalationController,
);
ticketRouter.get("/:id", getTicket);
