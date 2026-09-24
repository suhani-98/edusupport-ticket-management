import { Link } from "react-router-dom";
import { formatAge, formatDateTime } from "../../lib/format";
import type { TicketSummary } from "../../types/ticket";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketSlaBadge } from "./TicketSlaBadge";
import { TicketStatusBadge } from "./TicketStatusBadge";

export function TicketList({
  tickets,
  hrefFor = (id: string) => `/student/tickets/${id}`,
  showAge = false,
  showAssignee = false,
}: {
  tickets: TicketSummary[];
  hrefFor?: (id: string) => string;
  showAge?: boolean;
  showAssignee?: boolean;
}) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <Link to={hrefFor(ticket.id)} className="font-semibold text-teal-900 hover:underline">
                {ticket.ticketNumber}
              </Link>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <Link to={hrefFor(ticket.id)} className="mt-2 block font-medium text-slate-900 hover:underline">
              {ticket.subject}
            </Link>
            <p className="mt-1 text-sm text-slate-600">{ticket.category?.name ?? "Uncategorised"}</p>
            {showAssignee ? (
              <p className="mt-1 text-sm text-slate-600">Assigned: {ticket.assignedTo?.name ?? "Unassigned"}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <TicketPriorityBadge priority={ticket.priority} />
              <TicketSlaBadge slaStatus={ticket.slaStatus} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Created {formatDateTime(ticket.createdAt)} · Updated {formatDateTime(ticket.updatedAt)}
              {showAge ? ` · Age ${formatAge(ticket.createdAt)}` : ""}
            </p>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Ticket #</th>
              <th className="px-4 py-3 font-semibold">Subject</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              {showAssignee ? <th className="px-4 py-3 font-semibold">Assigned</th> : null}
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">SLA</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              {showAge ? <th className="px-4 py-3 font-semibold">Age</th> : null}
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-teal-900">
                  <Link to={hrefFor(ticket.id)} className="hover:underline">
                    {ticket.ticketNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link to={hrefFor(ticket.id)} className="font-medium text-slate-900 hover:underline">
                    {ticket.subject}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{ticket.category?.name ?? "—"}</td>
                {showAssignee ? <td className="px-4 py-3 text-slate-700">{ticket.assignedTo?.name ?? "Unassigned"}</td> : null}
                <td className="px-4 py-3">
                  <TicketPriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-4 py-3">
                  <TicketStatusBadge status={ticket.status} />
                </td>
                <td className="px-4 py-3">
                  <TicketSlaBadge slaStatus={ticket.slaStatus} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDateTime(ticket.createdAt)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDateTime(ticket.updatedAt)}</td>
                {showAge ? <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatAge(ticket.createdAt)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
