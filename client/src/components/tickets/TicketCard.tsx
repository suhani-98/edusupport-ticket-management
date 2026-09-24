import { Link } from "react-router-dom";
import { formatDateTime } from "../../lib/format";
import type { TicketSummary } from "../../types/ticket";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketSlaBadge } from "./TicketSlaBadge";
import { TicketStatusBadge } from "./TicketStatusBadge";

export function TicketCard({ ticket, href }: { ticket: TicketSummary; href?: string }) {
  const to = href ?? `/student/tickets/${ticket.id}`;
  return (
    <Link
      to={to}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-teal-900">{ticket.ticketNumber}</p>
        <TicketStatusBadge status={ticket.status} />
      </div>
      <p className="mt-2 font-medium text-slate-900">{ticket.subject}</p>
      <p className="mt-1 text-sm text-slate-600">{ticket.category?.name ?? "Uncategorised"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <TicketPriorityBadge priority={ticket.priority} />
        <TicketSlaBadge slaStatus={ticket.slaStatus} />
      </div>
      <p className="mt-3 text-xs text-slate-500">Updated {formatDateTime(ticket.updatedAt)}</p>
    </Link>
  );
}
