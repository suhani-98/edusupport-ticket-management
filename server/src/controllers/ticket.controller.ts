import type { Request, Response } from "express";
import {
  addTicketComment,
  assignTicket,
  changeTicketPriority,
  changeTicketStatus,
  closeTicket,
  createTicketForStudent,
  getTicketForActor,
  listTicketActivities,
  listTicketComments,
  listTickets,
  reopenTicket,
  resolveTicket,
} from "../services/ticket.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  validateActivityListQuery,
  validateAssignmentBody,
  validateCommentBody,
  validateCreateTicketBody,
  validatePriorityBody,
  validateReopenBody,
  validateResolutionBody,
  validateStatusBody,
  validateTicketId,
  validateTicketListQuery,
} from "../validators/ticket.js";

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

export const assignTicketController = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = validateTicketId(String(req.params.id));
  const input = validateAssignmentBody(req.body);
  const ticket = await assignTicket(actor(req).userId, ticketId, input.assignedTo);
  sendSuccess(res, { ticket });
});

export const changeStatusController = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = validateTicketId(String(req.params.id));
  const input = validateStatusBody(req.body);
  const current = actor(req);
  const ticket = await changeTicketStatus(current.role, current.userId, ticketId, input.status);
  sendSuccess(res, { ticket });
});

export const changePriorityController = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = validateTicketId(String(req.params.id));
  const input = validatePriorityBody(req.body);
  const current = actor(req);
  const ticket = await changeTicketPriority(current.role, current.userId, ticketId, input.priority);
  sendSuccess(res, { ticket });
});

export const listActivitiesController = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = validateTicketId(String(req.params.id));
  const query = validateActivityListQuery(req.query as Record<string, unknown>);
  const current = actor(req);
  const result = await listTicketActivities(current.role, current.userId, ticketId, query);
  sendSuccess(res, result);
});

export const addCommentController = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = validateTicketId(String(req.params.id));
  const input = validateCommentBody(req.body);
  const current = actor(req);
  const comment = await addTicketComment(current.role, current.userId, ticketId, input);
  sendSuccess(res, { comment }, 201);
});

export const listCommentsController = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = validateTicketId(String(req.params.id));
  const query = validateActivityListQuery(req.query as Record<string, unknown>);
  const current = actor(req);
  const result = await listTicketComments(current.role, current.userId, ticketId, query);
  sendSuccess(res, result);
});

export const resolveTicketController = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = validateTicketId(String(req.params.id));
  const input = validateResolutionBody(req.body);
  const current = actor(req);
  const ticket = await resolveTicket(current.role, current.userId, ticketId, input.resolution);
  sendSuccess(res, { ticket });
});

export const closeTicketController = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = validateTicketId(String(req.params.id));
  const current = actor(req);
  const ticket = await closeTicket(current.role, current.userId, ticketId);
  sendSuccess(res, { ticket });
});

export const reopenTicketController = asyncHandler(async (req: Request, res: Response) => {
  const ticketId = validateTicketId(String(req.params.id));
  const input = validateReopenBody(req.body);
  const current = actor(req);
  const ticket = await reopenTicket(current.role, current.userId, ticketId, input.reason);
  sendSuccess(res, { ticket });
});
