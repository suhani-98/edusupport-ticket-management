import { Types } from "mongoose";
import { AppError } from "../utils/AppError.js";
import {
  DESCRIPTION_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
  slaStatuses,
  ticketPriorities,
  ticketStatuses,
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
