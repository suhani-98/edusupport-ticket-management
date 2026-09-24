import type { FilterQuery } from "mongoose";
import { deadlineFromPolicy, slaStatusAt } from "../domain/ticketRules.js";
import { Category } from "../models/Category.js";
import { SLAPolicy } from "../models/SLAPolicy.js";
import { Ticket } from "../models/Ticket.js";
import type { UserRole } from "../models/User.js";
import { ticketPriorities, type TicketPriority } from "../types/domain.js";
import { AppError } from "../utils/AppError.js";
import { nextTicketNumber } from "../utils/ticketNumber.js";
import { toTicketDetail, toTicketSummary, type TicketSource } from "../utils/ticketResponse.js";
import type { TicketListQuery } from "../validators/ticket.js";

const ticketPopulate = [
  { path: "categoryId", select: "name" },
  { path: "assignedTo", select: "name email" },
  { path: "studentId", select: "name email" },
];

function escapeSearch(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createTicketForStudent(
  studentId: string,
  input: { categoryId: string; subject: string; description: string },
) {
  const category = await Category.findById(input.categoryId);
  if (!category) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found.");
  }
  if (!category.isActive) {
    throw new AppError(422, "CATEGORY_INACTIVE", "This category is not accepting tickets.");
  }
  if (!ticketPriorities.includes(category.defaultPriority as TicketPriority)) {
    throw new AppError(422, "INVALID_CATEGORY", "Category default priority is not valid.");
  }
  const priority = category.defaultPriority as TicketPriority;
  const policy = await SLAPolicy.findOne({ priority, isActive: true });
  if (!policy) {
    throw new AppError(422, "SLA_POLICY_MISSING", "No active SLA policy exists for this priority.");
  }

  const createdAt = new Date();
  const slaDeadline = deadlineFromPolicy(createdAt, policy.resolutionTimeHours);
  const slaStatus = slaStatusAt(createdAt, slaDeadline, createdAt);
  const ticketNumber = await nextTicketNumber();

  // The number is consumed before insert. If insert fails, that number is skipped.
  // No ticket document is written, so the database is not left half-created.
  const ticket = await Ticket.create({
    ticketNumber,
    studentId,
    categoryId: category.id,
    subject: input.subject,
    description: input.description,
    priority,
    status: "OPEN",
    slaPolicyId: policy.id,
    slaDeadline,
    slaStatus,
    escalationLevel: 0,
    createdAt,
  });

  const populated = await Ticket.findById(ticket.id).populate(ticketPopulate).lean<TicketSource>();
  if (!populated) {
    throw new AppError(500, "INTERNAL_ERROR", "Ticket was created but could not be loaded.");
  }
  return toTicketDetail(populated);
}

function visibilityFilter(role: UserRole, userId: string, query: TicketListQuery): FilterQuery<unknown> {
  const filter: FilterQuery<unknown> = {};
  if (role === "student") {
    filter.studentId = userId;
  } else if (role === "staff") {
    filter.assignedTo = userId;
  } else if (query.assignedTo) {
    filter.assignedTo = query.assignedTo;
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.priority) {
    filter.priority = query.priority;
  }
  if (query.categoryId) {
    filter.categoryId = query.categoryId;
  }
  if (query.slaStatus) {
    filter.slaStatus = query.slaStatus;
  }
  if (query.search) {
    const pattern = escapeSearch(query.search);
    filter.$or = [
      { subject: { $regex: pattern, $options: "i" } },
      { ticketNumber: { $regex: pattern, $options: "i" } },
    ];
  }
  return filter;
}

export async function listTickets(role: UserRole, userId: string, query: TicketListQuery) {
  const filter = visibilityFilter(role, userId, query);
  const sortDirection = query.sortOrder === "asc" ? 1 : -1;
  const [total, tickets] = await Promise.all([
    Ticket.countDocuments(filter),
    Ticket.find(filter)
      .sort({ [query.sortBy]: sortDirection })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate(ticketPopulate)
      .lean<TicketSource[]>(),
  ]);
  return {
    tickets: tickets.map((ticket) => toTicketSummary(ticket)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}

export async function getTicketForActor(role: UserRole, userId: string, ticketId: string) {
  const filter: FilterQuery<unknown> = { _id: ticketId };
  if (role === "student") {
    filter.studentId = userId;
  } else if (role === "staff") {
    filter.assignedTo = userId;
  }
  const ticket = await Ticket.findOne(filter).populate(ticketPopulate).lean<TicketSource | null>();
  if (!ticket) {
    throw new AppError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  }
  return toTicketDetail(ticket);
}
