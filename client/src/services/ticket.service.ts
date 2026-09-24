import { apiRequest } from "./api";
import type { Activity, Comment, TicketDetail, TicketListParams, TicketListResponse } from "../types/ticket";

function queryString(params: TicketListParams): string {
  const search = new URLSearchParams();
  const entries: Array<[string, string | number | undefined]> = [
    ["page", params.page],
    ["limit", params.limit],
    ["status", params.status],
    ["priority", params.priority],
    ["slaStatus", params.slaStatus],
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
  return apiRequest<{ comment: Comment }>(`/tickets/${ticketId}/comments`, {
    method: "POST",
    body: JSON.stringify({ message, type: "PUBLIC" }),
  });
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
