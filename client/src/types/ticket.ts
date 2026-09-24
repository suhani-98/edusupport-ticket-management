export const ticketStatuses = ["OPEN", "ASSIGNED", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export const ticketPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type TicketPriority = (typeof ticketPriorities)[number];

export const slaStatuses = ["WITHIN_SLA", "APPROACHING_SLA", "BREACHED"] as const;
export type SlaStatus = (typeof slaStatuses)[number];

export const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  PENDING: "Pending",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const priorityLabels: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const slaLabels: Record<SlaStatus, string> = {
  WITHIN_SLA: "Within SLA",
  APPROACHING_SLA: "Approaching SLA",
  BREACHED: "SLA Breached",
};

export const SUBJECT_MAX_LENGTH = 140;
export const DESCRIPTION_MAX_LENGTH = 4000;
export const COMMENT_MAX_LENGTH = 2000;
export const REOPEN_REASON_MAX_LENGTH = 1000;
export const RESOLUTION_MAX_LENGTH = 4000;
export const ESCALATION_REASON_MAX_LENGTH = 1000;
export const SEARCH_MAX_LENGTH = 100;

export type TicketCategory = {
  id: string;
  name: string;
};

export type TicketSummary = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: TicketCategory | null;
  priority: TicketPriority;
  status: TicketStatus;
  slaStatus: SlaStatus;
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketDetail = TicketSummary & {
  description: string;
  resolution: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
};

export type TicketListResponse = {
  tickets: TicketSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type TicketListParams = {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  slaStatus?: SlaStatus;
  categoryId?: string;
  overdue?: boolean;
  search?: string;
  sortBy?: "createdAt" | "updatedAt" | "ticketNumber";
  sortOrder?: "asc" | "desc";
};

export type CommentType = "PUBLIC" | "INTERNAL";

export type Escalation = {
  id: string;
  level: "LEVEL_1" | "LEVEL_2";
  status: "OPEN" | "RESOLVED";
  reason: string;
  triggeredBy: { name: string } | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type StaffDashboard = {
  ticketCounts: {
    assigned: number;
    inProgress: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  slaCounts: {
    withinSla: number;
    approachingSla: number;
    breached: number;
    overdueOpen: number;
  };
  escalationCounts: {
    open: number;
    level1: number;
    level2: number;
  };
  recentTickets: TicketSummary[];
};

export type Comment = {
  id: string;
  message: string;
  type: CommentType;
  author: { id?: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  actor: { id?: string; name: string } | null;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  defaultPriority: TicketPriority;
  isActive: boolean;
};

export type StudentDashboard = {
  ticketCounts: {
    total: number;
    open: number;
    inProgress: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  slaCounts: {
    withinSla: number;
    approachingSla: number;
    breached: number;
  };
  recentTickets: TicketSummary[];
};

export function isTicketStatus(value: string): value is TicketStatus {
  return ticketStatuses.some((status) => status === value);
}

export function isTicketPriority(value: string): value is TicketPriority {
  return ticketPriorities.some((priority) => priority === value);
}
