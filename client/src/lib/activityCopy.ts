import { isTicketPriority, isTicketStatus, priorityLabels, statusLabels, type Activity } from "../types/ticket";

function safeText(value: string | null): string | null {
  if (!value || /^[a-fA-F0-9]{24}$/.test(value)) {
    return null;
  }
  return value;
}

export function activityCopy(activity: Activity): { title: string; detail?: string } | null {
  if (activity.action === "COMMENT_ADDED" && activity.newValue === "INTERNAL") {
    return null;
  }

  switch (activity.action) {
    case "TICKET_CREATED":
      return { title: "Ticket created" };
    case "TICKET_ASSIGNED":
      return { title: "Ticket assigned" };
    case "TICKET_REASSIGNED":
      return { title: "Ticket reassigned" };
    case "STATUS_CHANGED": {
      const from = activity.oldValue && isTicketStatus(activity.oldValue) ? statusLabels[activity.oldValue] : null;
      const to = activity.newValue && isTicketStatus(activity.newValue) ? statusLabels[activity.newValue] : null;
      return {
        title: "Status changed",
        detail: from && to ? `${from} to ${to}` : undefined,
      };
    }
    case "PRIORITY_CHANGED": {
      const from = activity.oldValue && isTicketPriority(activity.oldValue) ? priorityLabels[activity.oldValue] : null;
      const to = activity.newValue && isTicketPriority(activity.newValue) ? priorityLabels[activity.newValue] : null;
      return {
        title: "Priority changed",
        detail: from && to ? `${from} to ${to}` : undefined,
      };
    }
    case "SLA_BREACHED":
      return { title: "SLA marked breached" };
    case "RESOLVED":
      return { title: "Ticket resolved" };
    case "CLOSED":
      return { title: "Ticket closed" };
    case "REOPENED": {
      const reason = safeText(activity.newValue);
      return { title: "Ticket reopened", detail: reason ? `Reason: ${reason}` : undefined };
    }
    case "COMMENT_ADDED":
      return { title: "Public comment added" };
    case "ESCALATED":
      return { title: "Ticket escalated" };
    case "ESCALATION_RESOLVED":
      return { title: "Escalation resolved" };
    default:
      return { title: "Ticket updated" };
  }
}
