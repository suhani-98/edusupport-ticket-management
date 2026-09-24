import { apiRequest } from "./api";
import type {
  Activity,
  Comment,
  CommentType,
  Escalation,
  TicketDetail,
  TicketListParams,
  TicketListResponse,
  TicketPriority,
  TicketStatus,
} from "../types/ticket";

function queryString(params: TicketListParams): string {
  const search = new URLSearchParams();
  const entries: Array<[string, string | number | undefined]> = [
    ["page", params.page],
    ["limit", params.limit],
    ["status", params.status],
    ["priority", params.priority],
    ["slaStatus", params.slaStatus],
    ["categoryId", params.categoryId],
    ["assignedTo", params.assignedTo],
    ["overdue", params.overdue === undefined ? undefined : String(params.overdue)],
    ["search", params.search],
    ["sortBy", params.sortBy],
    ["sortOrder", params.sortOrder],
  ];
  for (const [key, value] of entries) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function getMyTickets(params: TicketListParams): Promise<TicketListResponse> {
  return apiRequest<TicketListResponse>(`/tickets${queryString(params)}`);
}

export function getAssignedTickets(params: TicketListParams): Promise<TicketListResponse> {
  return getMyTickets(params);
}

export function getAllTickets(params: TicketListParams): Promise<TicketListResponse> {
  return getMyTickets(params);
}

export function assignTicket(ticketId: string, staffId: string): Promise<{ ticket: TicketDetail }> {
  return apiRequest<{ ticket: TicketDetail }>(`/tickets/${ticketId}/assignment`, {
    method: "PATCH",
    body: JSON.stringify({ assignedTo: staffId }),
  });
}

export function getTicket(id: string): Promise<{ ticket: TicketDetail }> {
  return apiRequest<{ ticket: TicketDetail }>(`/tickets/${id}`);
}

export function createTicket(data: {
  categoryId: string;
  subject: string;
  description: string;
}): Promise<{ ticket: TicketDetail }> {
  return apiRequest<{ ticket: TicketDetail }>("/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getComments(ticketId: string): Promise<{ comments: Comment[] }> {
  return apiRequest<{ comments: Comment[] }>(`/tickets/${ticketId}/comments?limit=100`);
}

export function addPublicComment(ticketId: string, message: string): Promise<{ comment: Comment }> {
  return addComment(ticketId, message, "PUBLIC");
}

export function addComment(ticketId: string, message: string, type: CommentType): Promise<{ comment: Comment }> {
  return apiRequest<{ comment: Comment }>(`/tickets/${ticketId}/comments`, {
    method: "POST",
    body: JSON.stringify({ message, type }),
  });
}

export function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<{ ticket: TicketDetail }> {
  return apiRequest<{ ticket: TicketDetail }>(`/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateTicketPriority(ticketId: string, priority: TicketPriority): Promise<{ ticket: TicketDetail }> {
  return apiRequest<{ ticket: TicketDetail }>(`/tickets/${ticketId}/priority`, {
    method: "PATCH",
    body: JSON.stringify({ priority }),
  });
}

export function resolveTicket(ticketId: string, resolution: string): Promise<{ ticket: TicketDetail }> {
  return apiRequest<{ ticket: TicketDetail }>(`/tickets/${ticketId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ resolution }),
  });
}

export function refreshTicketSla(ticketId: string): Promise<{ ticket: TicketDetail }> {
  return apiRequest<{ ticket: TicketDetail }>(`/tickets/${ticketId}/sla/refresh`, { method: "PATCH" });
}

export function getEscalations(ticketId: string): Promise<{ escalations: Escalation[] }> {
  return apiRequest<{ escalations: Escalation[] }>(`/tickets/${ticketId}/escalations`);
}

export function escalateTicket(ticketId: string, reason: string): Promise<{ escalation: Escalation; ticket: TicketDetail }> {
  return apiRequest<{ escalation: Escalation; ticket: TicketDetail }>(`/tickets/${ticketId}/escalate`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function resolveEscalation(ticketId: string, escalationId: string): Promise<{ escalation: Escalation; ticket: TicketDetail }> {
  return apiRequest<{ escalation: Escalation; ticket: TicketDetail }>(
    `/tickets/${ticketId}/escalations/${escalationId}/resolve`,
    { method: "POST" },
  );
}

export function getActivities(ticketId: string): Promise<{ activities: Activity[] }> {
  return apiRequest<{ activities: Activity[] }>(`/tickets/${ticketId}/activities?limit=100`);
}

export function closeTicket(ticketId: string): Promise<{ ticket: TicketDetail }> {
  return apiRequest<{ ticket: TicketDetail }>(`/tickets/${ticketId}/close`, { method: "POST" });
}

export function reopenTicket(ticketId: string, reason: string): Promise<{ ticket: TicketDetail }> {
  return apiRequest<{ ticket: TicketDetail }>(`/tickets/${ticketId}/reopen`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
