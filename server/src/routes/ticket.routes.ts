import { Router } from "express";
import { createTicket, getTicket, listTicketController } from "../controllers/ticket.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const ticketRouter = Router();

ticketRouter.use(requireAuth);
ticketRouter.post("/", requireRole("student"), createTicket);
ticketRouter.get("/", listTicketController);
ticketRouter.get("/:id", getTicket);
