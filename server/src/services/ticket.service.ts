import type { FilterQuery } from "mongoose";
import { assertResolutionPresent, assertStatusTransition, deadlineFromPolicy, slaStatusAt } from "../domain/ticketRules.js";
import { Activity } from "../models/Activity.js";
import { Category } from "../models/Category.js";
import { SLAPolicy } from "../models/SLAPolicy.js";
import { Ticket } from "../models/Ticket.js";
import { User, type UserRole } from "../models/User.js";
import { ticketPriorities, type TicketPriority, type TicketStatus } from "../types/domain.js";
import { AppError } from "../utils/AppError.js";
import { nextTicketNumber } from "../utils/ticketNumber.js";
import { toTicketDetail, toTicketSummary, type TicketSource } from "../utils/ticketResponse.js";
import { recordActivity } from "./activity.service.js";
import type { ActivityListQuery, TicketListQuery } from "../validators/ticket.js";

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

  try {
    await recordActivity({
      ticketId: ticket.id,
      actorId: studentId,
      action: "TICKET_CREATED",
      newValue: "OPEN",
      metadata: { ticketNumber, priority },
    });
  } catch (error) {
    await Ticket.deleteOne({ _id: ticket.id });
    throw error;
  }

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

function accessFilter(role: UserRole, userId: string, ticketId: string): FilterQuery<unknown> {
  const filter: FilterQuery<unknown> = { _id: ticketId };
  if (role === "student") {
    filter.studentId = userId;
  } else if (role === "staff") {
    filter.assignedTo = userId;
  }
  return filter;
}

async function loadWritableTicket(role: UserRole, userId: string, ticketId: string) {
  const ticket = await Ticket.findOne(accessFilter(role, userId, ticketId));
  if (!ticket) {
    throw new AppError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  }
  return ticket;
}

async function reloadTicket(ticketId: string) {
  const populated = await Ticket.findById(ticketId).populate(ticketPopulate).lean<TicketSource | null>();
  if (!populated) {
    throw new AppError(500, "INTERNAL_ERROR", "Ticket was updated but could not be loaded.");
  }
  return toTicketDetail(populated);
}

export async function assignTicket(actorId: string, ticketId: string, assignedTo: string) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new AppError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  }
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
    throw new AppError(422, "TICKET_NOT_ASSIGNABLE", "Resolved and closed tickets cannot be assigned.");
  }

  const staff = await User.findById(assignedTo).select("role isActive");
  if (!staff) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }
  if (!staff.isActive) {
    throw new AppError(422, "STAFF_INACTIVE", "Inactive staff cannot be assigned.");
  }
  if (staff.role === "student") {
    throw new AppError(422, "INVALID_ASSIGNEE", "A ticket cannot be assigned to a student.");
  }
  if (staff.role === "manager") {
    throw new AppError(422, "INVALID_ASSIGNEE", "A ticket cannot be assigned to a manager.");
  }

  const previousAssigneeId = ticket.assignedTo ? ticket.assignedTo.toString() : null;
  const previousAssignee = ticket.assignedTo;
  if (previousAssigneeId === assignedTo) {
    throw new AppError(422, "ALREADY_ASSIGNED", "This ticket is already assigned to that staff member.");
  }

  const previousStatus = ticket.status;
  const firstAssignment = previousAssigneeId === null;
  ticket.assignedTo = staff.id;
  if (firstAssignment && ticket.status === "OPEN") {
    ticket.status = "ASSIGNED";
  }
  await ticket.save();

  try {
    await recordActivity({
      ticketId: ticket.id,
      actorId,
      action: firstAssignment ? "TICKET_ASSIGNED" : "TICKET_REASSIGNED",
      oldValue: previousAssigneeId,
      newValue: staff.id,
    });
  } catch (error) {
    ticket.assignedTo = previousAssignee;
    ticket.status = previousStatus;
    await ticket.save();
    throw error;
  }

  return reloadTicket(ticket.id);
}

export async function changeTicketStatus(
  role: UserRole,
  userId: string,
  ticketId: string,
  nextStatus: TicketStatus,
) {
  const ticket = await loadWritableTicket(role, userId, ticketId);
  assertStatusTransition(ticket.status, nextStatus);
  if (nextStatus === "ASSIGNED" && !ticket.assignedTo) {
    throw new AppError(422, "ASSIGNMENT_REQUIRED", "Assign a staff member before setting status to ASSIGNED.");
  }
  if (nextStatus === "RESOLVED") {
    assertResolutionPresent(ticket.resolution);
  }

  const previousStatus = ticket.status;
  ticket.status = nextStatus;
  if (nextStatus === "RESOLVED" && !ticket.resolvedAt) {
    ticket.resolvedAt = new Date();
  }
  if (nextStatus === "CLOSED") {
    ticket.closedAt = new Date();
  }
  await ticket.save();

  try {
    await recordActivity({
      ticketId: ticket.id,
      actorId: userId,
      action: "STATUS_CHANGED",
      oldValue: previousStatus,
      newValue: nextStatus,
    });
  } catch (error) {
    ticket.status = previousStatus;
    if (nextStatus === "CLOSED") {
      ticket.closedAt = undefined;
    }
    await ticket.save();
    throw error;
  }

  return reloadTicket(ticket.id);
}

export async function changeTicketPriority(
  role: UserRole,
  userId: string,
  ticketId: string,
  priority: TicketPriority,
) {
  const ticket = await loadWritableTicket(role, userId, ticketId);
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
    throw new AppError(422, "PRIORITY_LOCKED", "Priority cannot change after a ticket is resolved or closed.");
  }
  if (ticket.priority === priority) {
    throw new AppError(422, "PRIORITY_UNCHANGED", "The ticket already has this priority.");
  }

  const policy = await SLAPolicy.findOne({ priority, isActive: true });
  if (!policy) {
    throw new AppError(422, "SLA_POLICY_MISSING", "No active SLA policy exists for this priority.");
  }

  const previousPriority = ticket.priority;
  const previousPolicyId = ticket.slaPolicyId;
  const previousDeadline = ticket.slaDeadline;
  const previousSlaStatus = ticket.slaStatus;
  const deadline = deadlineFromPolicy(ticket.createdAt, policy.resolutionTimeHours);

  ticket.priority = priority;
  ticket.slaPolicyId = policy.id;
  ticket.slaDeadline = deadline;
  ticket.slaStatus = slaStatusAt(ticket.createdAt, deadline, new Date());
  await ticket.save();

  try {
    await recordActivity({
      ticketId: ticket.id,
      actorId: userId,
      action: "PRIORITY_CHANGED",
      oldValue: previousPriority,
      newValue: priority,
    });
  } catch (error) {
    ticket.priority = previousPriority;
    ticket.slaPolicyId = previousPolicyId;
    ticket.slaDeadline = previousDeadline;
    ticket.slaStatus = previousSlaStatus;
    await ticket.save();
    throw error;
  }

  return reloadTicket(ticket.id);
}

export async function listTicketActivities(role: UserRole, userId: string, ticketId: string, query: ActivityListQuery) {
  const visible = await Ticket.findOne(accessFilter(role, userId, ticketId)).select("_id");
  if (!visible) {
    throw new AppError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  }

  const filter = { ticketId };
  const [total, activities] = await Promise.all([
    Activity.countDocuments(filter),
    Activity.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate({ path: "actorId", select: "name" })
      .lean(),
  ]);

  return {
    activities: activities.map((activity) => {
      const actor = activity.actorId as { _id?: { toString(): string }; name?: string } | null;
      return {
        id: activity._id.toString(),
        action: activity.action,
        oldValue: activity.oldValue ?? null,
        newValue: activity.newValue ?? null,
        actor: actor && actor.name ? { id: actor._id?.toString(), name: actor.name } : null,
        createdAt: activity.createdAt,
      };
    }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}
