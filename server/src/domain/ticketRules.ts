import { AppError } from "../utils/AppError.js";
import type { SlaStatus, TicketStatus } from "../types/domain.js";

const nextStatuses: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["PENDING", "RESOLVED"],
  PENDING: ["IN_PROGRESS"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

const APPROACHING_REMAINING_RATIO = 0.25;

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return nextStatuses[from].includes(to);
}

export function assertStatusTransition(from: TicketStatus, to: TicketStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError(422, "INVALID_TRANSITION", `Cannot change status from ${from} to ${to}.`);
  }
}

export function assertResolutionPresent(resolution: string | null | undefined): void {
  if (!resolution || resolution.trim().length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Resolution details are required.");
  }
}

export function deadlineFromPolicy(createdAt: Date, resolutionTimeHours: number): Date {
  return new Date(createdAt.getTime() + resolutionTimeHours * 60 * 60 * 1000);
}

export function slaStatusAt(createdAt: Date, deadline: Date, now: Date): SlaStatus {
  if (now.getTime() >= deadline.getTime()) {
    return "BREACHED";
  }
  const total = deadline.getTime() - createdAt.getTime();
  const remaining = deadline.getTime() - now.getTime();
  if (total > 0 && remaining / total <= APPROACHING_REMAINING_RATIO) {
    return "APPROACHING_SLA";
  }
  return "WITHIN_SLA";
}
