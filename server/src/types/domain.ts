export const ticketStatuses = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING",
  "RESOLVED",
  "CLOSED",
] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export const ticketPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type TicketPriority = (typeof ticketPriorities)[number];

export const slaStatuses = ["WITHIN_SLA", "APPROACHING_SLA", "BREACHED"] as const;
export type SlaStatus = (typeof slaStatuses)[number];

export const activityActions = [
  "TICKET_CREATED",
  "TICKET_ASSIGNED",
  "TICKET_REASSIGNED",
  "STATUS_CHANGED",
  "PRIORITY_CHANGED",
  "SLA_BREACHED",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "COMMENT_ADDED",
] as const;
export type ActivityAction = (typeof activityActions)[number];

export const commentTypes = ["PUBLIC", "INTERNAL"] as const;
export type CommentType = (typeof commentTypes)[number];

export const SUBJECT_MAX_LENGTH = 140;
export const DESCRIPTION_MAX_LENGTH = 4000;
export const RESOLUTION_MAX_LENGTH = 4000;
export const COMMENT_MAX_LENGTH = 2000;
export const REOPEN_REASON_MAX_LENGTH = 1000;
export const CATEGORY_NAME_MAX_LENGTH = 80;
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 500;
