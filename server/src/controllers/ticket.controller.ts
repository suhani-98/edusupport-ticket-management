import type { Request, Response } from "express";
import { createTicketForStudent, getTicketForActor, listTickets } from "../services/ticket.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateCreateTicketBody, validateTicketId, validateTicketListQuery } from "../validators/ticket.js";

function actor(req: Request): { userId: string; role: "student" | "staff" | "manager" } {
  if (!req.auth) {
    throw new AppError(401, "MISSING_TOKEN", "Authentication is required.");
  }
  return req.auth;
}

export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const input = validateCreateTicketBody(req.body);
  const ticket = await createTicketForStudent(actor(req).userId, input);
  sendSuccess(res, { ticket }, 201);
});

export const listTicketController = asyncHandler(async (req: Request, res: Response) => {
  const query = validateTicketListQuery(req.query as Record<string, unknown>);
  const current = actor(req);
  const result = await listTickets(current.role, current.userId, query);
  sendSuccess(res, result);
});

export const getTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = validateTicketId(String(req.params.id));
  const current = actor(req);
  const ticket = await getTicketForActor(current.role, current.userId, ticketId);
  sendSuccess(res, { ticket });
});
