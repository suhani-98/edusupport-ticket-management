import type { FilterQuery } from "mongoose";
import { assertResolutionPresent, assertStatusTransition, deadlineFromPolicy, slaStatusAt } from "../domain/ticketRules.js";
import { Activity } from "../models/Activity.js";
import { Category } from "../models/Category.js";
import { Comment } from "../models/Comment.js";
import { Escalation } from "../models/Escalation.js";
import { SLAPolicy } from "../models/SLAPolicy.js";
import { Ticket } from "../models/Ticket.js";
import { User, type UserRole } from "../models/User.js";
import {
  ticketPriorities,
  type CommentType,
  type EscalationLevel,
  type TicketPriority,
  type TicketStatus,
} from "../types/domain.js";
import { AppError } from "../utils/AppError.js";
import { nextTicketNumber } from "../utils/ticketNumber.js";
import { toTicketDetail, toTicketSummary, type TicketSource } from "../utils/ticketResponse.js";
import { recordActivities, recordActivity } from "./activity.service.js";
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
  if (query.overdue === true) {
    filter.slaDeadline = { $lte: new Date() };
    if (query.status === "CLOSED") {
      filter.ticketNumber = "__no-match__";
    } else if (!query.status) {
      filter.status = { $ne: "CLOSED" };
    }
  } else if (query.overdue === false) {
    filter.slaDeadline = { $gt: new Date() };
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
    throw new AppError(422, "USE_RESOLVE", "Resolve a ticket with the resolve action.");
  }
  if (nextStatus === "CLOSED") {
    throw new AppError(422, "USE_CLOSE", "Close a ticket with the close action.");
  }

  const previousStatus = ticket.status;
  ticket.status = nextStatus;
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

  const filter: FilterQuery<unknown> = { ticketId };
  if (role === "student") {
    filter.$nor = [{ action: "COMMENT_ADDED", newValue: "INTERNAL" }];
  }
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
        metadata: activity.metadata ?? null,
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

async function loadReadableTicket(role: UserRole, userId: string, ticketId: string) {
  const ticket = await Ticket.findOne(accessFilter(role, userId, ticketId));
  if (!ticket) {
    throw new AppError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  }
  return ticket;
}

function commentDto(comment: {
  _id: { toString(): string };
  message: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: { _id?: { toString(): string }; name?: string } | null;
}) {
  const author = comment.authorId;
  return {
    id: comment._id.toString(),
    message: comment.message,
    type: comment.type,
    author: author && author.name ? { id: author._id?.toString(), name: author.name } : null,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

export async function addTicketComment(
  role: UserRole,
  userId: string,
  ticketId: string,
  input: { message: string; type: CommentType },
) {
  if (input.type === "INTERNAL" && role === "student") {
    throw new AppError(403, "FORBIDDEN", "Students cannot add internal notes.");
  }
  const ticket = await loadReadableTicket(role, userId, ticketId);
  const comment = await Comment.create({
    ticketId: ticket.id,
    authorId: userId,
    message: input.message,
    type: input.type,
  });
  try {
    await recordActivity({
      ticketId: ticket.id,
      actorId: userId,
      action: "COMMENT_ADDED",
      newValue: input.type,
    });
  } catch (error) {
    await Comment.deleteOne({ _id: comment.id });
    throw error;
  }
  const populated = await Comment.findById(comment.id).populate({ path: "authorId", select: "name" }).lean();
  if (!populated) {
    throw new AppError(500, "INTERNAL_ERROR", "Comment was created but could not be loaded.");
  }
  return commentDto(populated as Parameters<typeof commentDto>[0]);
}

export async function listTicketComments(role: UserRole, userId: string, ticketId: string, query: ActivityListQuery) {
  await loadReadableTicket(role, userId, ticketId);
  const filter: FilterQuery<unknown> = { ticketId };
  if (role === "student") {
    filter.type = "PUBLIC";
  }
  const [total, comments] = await Promise.all([
    Comment.countDocuments(filter),
    Comment.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate({ path: "authorId", select: "name" })
      .lean(),
  ]);
  return {
    comments: comments.map((comment) => commentDto(comment as Parameters<typeof commentDto>[0])),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}

export async function resolveTicket(role: UserRole, userId: string, ticketId: string, resolution: string) {
  const ticket = await loadWritableTicket(role, userId, ticketId);
  assertStatusTransition(ticket.status, "RESOLVED");
  const previousStatus = ticket.status;
  const previousResolution = ticket.resolution;
  const previousResolvedAt = ticket.resolvedAt;
  ticket.status = "RESOLVED";
  ticket.resolution = resolution;
  ticket.resolvedAt = new Date();
  await ticket.save();
  try {
    await recordActivities([
      {
        ticketId: ticket.id,
        actorId: userId,
        action: "STATUS_CHANGED",
        oldValue: previousStatus,
        newValue: "RESOLVED",
      },
      { ticketId: ticket.id, actorId: userId, action: "RESOLVED", newValue: resolution },
    ]);
  } catch (error) {
    ticket.status = previousStatus;
    ticket.resolution = previousResolution;
    ticket.resolvedAt = previousResolvedAt;
    await ticket.save();
    throw error;
  }
  return reloadTicket(ticket.id);
}

export async function closeTicket(role: UserRole, userId: string, ticketId: string) {
  const ticket = await loadReadableTicket(role, userId, ticketId);
  assertStatusTransition(ticket.status, "CLOSED");
  const previousStatus = ticket.status;
  const previousClosedAt = ticket.closedAt;
  ticket.status = "CLOSED";
  ticket.closedAt = new Date();
  await ticket.save();
  try {
    await recordActivities([
      {
        ticketId: ticket.id,
        actorId: userId,
        action: "STATUS_CHANGED",
        oldValue: previousStatus,
        newValue: "CLOSED",
      },
      { ticketId: ticket.id, actorId: userId, action: "CLOSED", newValue: "CLOSED" },
    ]);
  } catch (error) {
    ticket.status = previousStatus;
    ticket.closedAt = previousClosedAt;
    await ticket.save();
    throw error;
  }
  return reloadTicket(ticket.id);
}

export async function reopenTicket(role: UserRole, userId: string, ticketId: string, reason: string) {
  const ticket = await loadReadableTicket(role, userId, ticketId);
  if (ticket.status !== "CLOSED") {
    throw new AppError(422, "INVALID_TRANSITION", `Cannot change status from ${ticket.status} to IN_PROGRESS.`);
  }
  const previousStatus = ticket.status;
  const previousResolution = ticket.resolution;
  const previousResolvedAt = ticket.resolvedAt;
  const previousClosedAt = ticket.closedAt;
  ticket.status = "IN_PROGRESS";
  ticket.set("resolution", undefined);
  ticket.set("resolvedAt", undefined);
  ticket.set("closedAt", undefined);
  await ticket.save();
  try {
    await recordActivities([
      {
        ticketId: ticket.id,
        actorId: userId,
        action: "STATUS_CHANGED",
        oldValue: previousStatus,
        newValue: "IN_PROGRESS",
      },
      {
        ticketId: ticket.id,
        actorId: userId,
        action: "REOPENED",
        oldValue: previousResolution ?? null,
        newValue: reason,
      },
    ]);
  } catch (error) {
    ticket.status = previousStatus;
    ticket.resolution = previousResolution;
    ticket.resolvedAt = previousResolvedAt;
    ticket.closedAt = previousClosedAt;
    await ticket.save();
    throw error;
  }
  return reloadTicket(ticket.id);
}

function scopeFilter(role: UserRole, userId: string): FilterQuery<unknown> {
  if (role === "staff") {
    return { assignedTo: userId };
  }
  return {};
}

export async function refreshTicketSla(role: UserRole, userId: string, ticketId: string) {
  const ticket = await loadWritableTicket(role, userId, ticketId);
  const previousStatus = ticket.slaStatus;
  const nextStatus = slaStatusAt(ticket.createdAt, ticket.slaDeadline, new Date());
  if (previousStatus === nextStatus) {
    return reloadTicket(ticket.id);
  }
  ticket.slaStatus = nextStatus;
  await ticket.save();
  if (nextStatus !== "BREACHED") {
    return reloadTicket(ticket.id);
  }
  try {
    await recordActivity({
      ticketId: ticket.id,
      actorId: userId,
      action: "SLA_BREACHED",
      oldValue: previousStatus,
      newValue: "BREACHED",
      metadata: { oldSlaStatus: previousStatus, newSlaStatus: "BREACHED" },
    });
  } catch (error) {
    ticket.slaStatus = previousStatus;
    await ticket.save();
    throw error;
  }
  return reloadTicket(ticket.id);
}

export async function summarizeSla(role: UserRole, userId: string) {
  const scope = scopeFilter(role, userId);
  const now = new Date();
  const [totalOpen, withinSla, approachingSla, breached, overdueOpen] = await Promise.all([
    Ticket.countDocuments({ ...scope, status: { $ne: "CLOSED" } }),
    Ticket.countDocuments({ ...scope, slaStatus: "WITHIN_SLA" }),
    Ticket.countDocuments({ ...scope, slaStatus: "APPROACHING_SLA" }),
    Ticket.countDocuments({ ...scope, slaStatus: "BREACHED" }),
    Ticket.countDocuments({ ...scope, status: { $ne: "CLOSED" }, slaDeadline: { $lte: now } }),
  ]);
  return { totalOpen, withinSla, approachingSla, breached, overdueOpen };
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000;
}

function escalationDto(escalation: {
  _id: { toString(): string };
  ticketId: { toString(): string };
  level: string;
  status: string;
  reason: string;
  previousAssignee?: { toString(): string } | null;
  newAssignee?: { toString(): string } | null;
  createdAt: Date;
  resolvedAt?: Date | null;
  triggeredBy: { _id?: { toString(): string }; name?: string } | null;
}) {
  const actor = escalation.triggeredBy;
  return {
    id: escalation._id.toString(),
    ticketId: escalation.ticketId.toString(),
    level: escalation.level,
    status: escalation.status,
    reason: escalation.reason,
    previousAssignee: escalation.previousAssignee ? escalation.previousAssignee.toString() : null,
    newAssignee: escalation.newAssignee ? escalation.newAssignee.toString() : null,
    triggeredBy: actor && actor.name ? { id: actor._id?.toString(), name: actor.name } : null,
    createdAt: escalation.createdAt,
    resolvedAt: escalation.resolvedAt ?? null,
  };
}

export async function escalateTicket(role: UserRole, userId: string, ticketId: string, reason: string) {
  const ticket = await loadWritableTicket(role, userId, ticketId);
  const openEscalations = await Escalation.find({ ticketId: ticket.id, status: "OPEN" }).select("level");
  if (openEscalations.some((item) => item.level === "LEVEL_2")) {
    throw new AppError(409, "ESCALATION_ALREADY_OPEN", "This ticket already has an open level 2 escalation.");
  }
  const level: EscalationLevel = openEscalations.some((item) => item.level === "LEVEL_1") ? "LEVEL_2" : "LEVEL_1";
  const previousAssignee = ticket.assignedTo ? ticket.assignedTo.toString() : null;
  let escalation;
  try {
    escalation = await Escalation.create({
      ticketId: ticket.id,
      triggeredBy: userId,
      reason,
      previousAssignee,
      level,
      status: "OPEN",
    });
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new AppError(409, "ESCALATION_ALREADY_OPEN", "An open escalation already exists at this level.");
    }
    throw error;
  }
  try {
    await recordActivity({
      ticketId: ticket.id,
      actorId: userId,
      action: "ESCALATED",
      newValue: level,
      metadata: { escalationId: escalation.id, level, reason },
    });
  } catch (error) {
    await Escalation.deleteOne({ _id: escalation.id });
    throw error;
  }
  const populated = await Escalation.findById(escalation.id).populate({ path: "triggeredBy", select: "name" }).lean();
  return {
    escalation: escalationDto(populated as Parameters<typeof escalationDto>[0]),
    ticket: await reloadTicket(ticket.id),
  };
}

export async function listTicketEscalations(role: UserRole, userId: string, ticketId: string) {
  const ticket = await loadReadableTicket(role, userId, ticketId);
  const escalations = await Escalation.find({ ticketId: ticket.id })
    .sort({ createdAt: 1, _id: 1 })
    .populate({ path: "triggeredBy", select: "name" })
    .lean();
  return escalations.map((item) => escalationDto(item as Parameters<typeof escalationDto>[0]));
}

export async function resolveEscalation(role: UserRole, userId: string, ticketId: string, escalationId: string) {
  await loadWritableTicket(role, userId, ticketId);
  const escalation = await Escalation.findOne({ _id: escalationId, ticketId });
  if (!escalation) {
    throw new AppError(404, "ESCALATION_NOT_FOUND", "Escalation not found.");
  }
  if (escalation.status !== "OPEN") {
    throw new AppError(409, "ESCALATION_NOT_OPEN", "This escalation is already resolved.");
  }
  const previousResolvedAt = escalation.resolvedAt;
  escalation.status = "RESOLVED";
  escalation.resolvedAt = new Date();
  await escalation.save();
  try {
    await recordActivity({
      ticketId,
      actorId: userId,
      action: "ESCALATION_RESOLVED",
      newValue: escalation.level,
      metadata: { escalationId: escalation.id, level: escalation.level },
    });
  } catch (error) {
    escalation.status = "OPEN";
    escalation.resolvedAt = previousResolvedAt;
    await escalation.save();
    throw error;
  }
  const populated = await Escalation.findById(escalation.id).populate({ path: "triggeredBy", select: "name" }).lean();
  return {
    escalation: escalationDto(populated as Parameters<typeof escalationDto>[0]),
    ticket: await reloadTicket(ticketId),
  };
}
