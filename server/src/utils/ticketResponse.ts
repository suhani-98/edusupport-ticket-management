type Person = { _id: { toString(): string }; name: string; email: string } | null;
type CategoryRef = { _id: { toString(): string }; name: string } | null;

export type TicketSource = {
  _id: { toString(): string };
  ticketNumber: string;
  subject: string;
  description?: string;
  priority: string;
  status: string;
  slaStatus: string;
  slaDeadline: Date;
  escalationLevel: number;
  resolution?: string | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  categoryId: CategoryRef;
  assignedTo: Person;
  studentId: Person;
};

function person(value: Person) {
  if (!value) {
    return null;
  }
  return { id: value._id.toString(), name: value.name, email: value.email };
}

export function toTicketSummary(ticket: TicketSource) {
  return {
    id: ticket._id.toString(),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    category: ticket.categoryId
      ? { id: ticket.categoryId._id.toString(), name: ticket.categoryId.name }
      : null,
    priority: ticket.priority,
    status: ticket.status,
    slaStatus: ticket.slaStatus,
    slaDeadline: ticket.slaDeadline,
    assignedTo: person(ticket.assignedTo),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

export function toTicketDetail(ticket: TicketSource) {
  return {
    ...toTicketSummary(ticket),
    description: ticket.description ?? "",
    student: person(ticket.studentId),
    escalationLevel: ticket.escalationLevel,
    resolution: ticket.resolution ?? null,
    resolvedAt: ticket.resolvedAt ?? null,
    closedAt: ticket.closedAt ?? null,
    updatedAt: ticket.updatedAt,
  };
}
