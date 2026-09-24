import { Types } from "mongoose";
import { AppError } from "../utils/AppError.js";
import {
  COMMENT_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  REOPEN_REASON_MAX_LENGTH,
  RESOLUTION_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
  commentTypes,
  slaStatuses,
  ticketPriorities,
  ticketStatuses,
  type CommentType,
  type SlaStatus,
  type TicketPriority,
  type TicketStatus,
} from "../types/domain.js";

const CLIENT_CONTROLLED_FIELDS = [
  "studentId",
  "assignedTo",
  "status",
  "ticketNumber",
  "slaPolicyId",
  "slaDeadline",
  "slaStatus",
  "escalationLevel",
  "resolution",
  "resolvedAt",
  "closedAt",
  "priority",
] as const;

const SORT_FIELDS = ["createdAt", "updatedAt", "ticketNumber"] as const;

export function isObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export function validateCreateTicketBody(body: unknown): {
  categoryId: string;
  subject: string;
  description: string;
} {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "VALIDATION_ERROR", "Request body is required.");
  }
  const record = body as Record<string, unknown>;
  const forbidden = CLIENT_CONTROLLED_FIELDS.filter((field) => record[field] !== undefined);
  if (forbidden.length > 0) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `These fields are set by the server: ${forbidden.join(", ")}.`,
    );
  }
  if (typeof record.categoryId !== "string" || !isObjectId(record.categoryId)) {
    throw new AppError(400, "VALIDATION_ERROR", "categoryId must be a valid id.");
  }
  if (typeof record.subject !== "string" || record.subject.trim().length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Subject is required.");
  }
  const subject = record.subject.trim();
  if (subject.length > SUBJECT_MAX_LENGTH) {
    throw new AppError(400, "VALIDATION_ERROR", `Subject must be at most ${SUBJECT_MAX_LENGTH} characters.`);
  }
  if (typeof record.description !== "string" || record.description.trim().length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Description is required.");
  }
  const description = record.description.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`,
    );
  }
  return { categoryId: record.categoryId, subject, description };
}

export type TicketListQuery = {
  page: number;
  limit: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  assignedTo?: string;
  slaStatus?: SlaStatus;
  search?: string;
  sortBy: "createdAt" | "updatedAt" | "ticketNumber";
  sortOrder: "asc" | "desc";
};

function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new AppError(400, "VALIDATION_ERROR", `${field} is not valid.`);
  }
  return value as T;
}

export function validateTicketListQuery(query: Record<string, unknown>): TicketListQuery {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(400, "VALIDATION_ERROR", "page must be an integer of at least 1.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, "VALIDATION_ERROR", "limit must be an integer from 1 to 100.");
  }
  let parsedCategoryId: string | undefined;
  if (query.categoryId !== undefined && query.categoryId !== "") {
    if (typeof query.categoryId !== "string" || !isObjectId(query.categoryId)) {
      throw new AppError(400, "VALIDATION_ERROR", "categoryId must be a valid id.");
    }
    parsedCategoryId = query.categoryId;
  }
  let assignedTo: string | undefined;
  if (query.assignedTo !== undefined && query.assignedTo !== "") {
    if (typeof query.assignedTo !== "string" || !isObjectId(query.assignedTo)) {
      throw new AppError(400, "VALIDATION_ERROR", "assignedTo must be a valid id.");
    }
    assignedTo = query.assignedTo;
  }
  const sortBy = query.sortBy === undefined ? "createdAt" : query.sortBy;
  if (typeof sortBy !== "string" || !SORT_FIELDS.includes(sortBy as (typeof SORT_FIELDS)[number])) {
    throw new AppError(400, "VALIDATION_ERROR", "sortBy is not valid.");
  }
  const sortOrder = query.sortOrder === undefined ? "desc" : query.sortOrder;
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new AppError(400, "VALIDATION_ERROR", "sortOrder must be asc or desc.");
  }
  const search = query.search === undefined || query.search === "" ? undefined : String(query.search).trim();
  if (search && search.length > 100) {
    throw new AppError(400, "VALIDATION_ERROR", "search must be at most 100 characters.");
  }
  return {
    page,
    limit,
    status: optionalEnum(query.status, ticketStatuses, "status"),
    priority: optionalEnum(query.priority, ticketPriorities, "priority"),
    categoryId: parsedCategoryId,
    assignedTo,
    slaStatus: optionalEnum(query.slaStatus, slaStatuses, "slaStatus"),
    search: search || undefined,
    sortBy: sortBy as TicketListQuery["sortBy"],
    sortOrder,
  };
}

export function validateTicketId(id: string): string {
  if (!isObjectId(id) || !Types.ObjectId.isValid(id)) {
    throw new AppError(400, "VALIDATION_ERROR", "Ticket id is not valid.");
  }
  return id;
}

function requireObject(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "VALIDATION_ERROR", "Request body is required.");
  }
  return body as Record<string, unknown>;
}

function rejectFields(record: Record<string, unknown>, fields: readonly string[]): void {
  const forbidden = fields.filter((field) => record[field] !== undefined);
  if (forbidden.length > 0) {
    throw new AppError(400, "VALIDATION_ERROR", `These fields are set by the server: ${forbidden.join(", ")}.`);
  }
}

const SERVER_OWNED_UPDATE_FIELDS = ["slaDeadline", "slaStatus", "slaPolicyId", "escalationLevel", "studentId", "ticketNumber"] as const;

export function validateAssignmentBody(body: unknown): { assignedTo: string } {
  const record = requireObject(body);
  rejectFields(record, [...SERVER_OWNED_UPDATE_FIELDS, "status", "priority", "resolution"]);
  if (typeof record.assignedTo !== "string" || !isObjectId(record.assignedTo)) {
    throw new AppError(400, "VALIDATION_ERROR", "assignedTo must be a valid id.");
  }
  return { assignedTo: record.assignedTo };
}

export function validateStatusBody(body: unknown): { status: TicketStatus } {
  const record = requireObject(body);
  rejectFields(record, [...SERVER_OWNED_UPDATE_FIELDS, "assignedTo", "priority", "resolution", "resolvedAt", "closedAt"]);
  if (typeof record.status !== "string" || !ticketStatuses.includes(record.status as TicketStatus)) {
    throw new AppError(400, "VALIDATION_ERROR", "status is not valid.");
  }
  return { status: record.status as TicketStatus };
}

export function validatePriorityBody(body: unknown): { priority: TicketPriority } {
  const record = requireObject(body);
  rejectFields(record, [...SERVER_OWNED_UPDATE_FIELDS, "assignedTo", "status", "resolution"]);
  if (typeof record.priority !== "string" || !ticketPriorities.includes(record.priority as TicketPriority)) {
    throw new AppError(400, "VALIDATION_ERROR", "priority is not valid.");
  }
  return { priority: record.priority as TicketPriority };
}

export type ActivityListQuery = { page: number; limit: number };

export function validateActivityListQuery(query: Record<string, unknown>): ActivityListQuery {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(400, "VALIDATION_ERROR", "page must be an integer of at least 1.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, "VALIDATION_ERROR", "limit must be an integer from 1 to 100.");
  }
  return { page, limit };
}

function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", `${field} is required.`);
  }
  const text = value.trim();
  if (text.length > max) {
    throw new AppError(400, "VALIDATION_ERROR", `${field} must be at most ${max} characters.`);
  }
  return text;
}

export function validateCommentBody(body: unknown): { message: string; type: CommentType } {
  const record = requireObject(body);
  rejectFields(record, ["authorId", "ticketId", "createdAt"]);
  const message = requiredText(record.message, "Message", COMMENT_MAX_LENGTH);
  if (typeof record.type !== "string" || !commentTypes.includes(record.type as CommentType)) {
    throw new AppError(400, "VALIDATION_ERROR", "type must be PUBLIC or INTERNAL.");
  }
  return { message, type: record.type as CommentType };
}

export function validateResolutionBody(body: unknown): { resolution: string } {
  const record = requireObject(body);
  rejectFields(record, ["status", "resolvedAt", "closedAt", "authorId"]);
  return { resolution: requiredText(record.resolution, "Resolution", RESOLUTION_MAX_LENGTH) };
}

export function validateReopenBody(body: unknown): { reason: string } {
  const record = requireObject(body);
  rejectFields(record, ["status", "resolvedAt", "closedAt", "resolution"]);
  return { reason: requiredText(record.reason, "Reason", REOPEN_REASON_MAX_LENGTH) };
}
