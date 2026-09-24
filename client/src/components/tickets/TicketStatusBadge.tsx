import { statusLabels, type TicketStatus } from "../../types/ticket";

const tones: Record<TicketStatus, string> = {
  OPEN: "bg-sky-50 text-sky-900",
  ASSIGNED: "bg-indigo-50 text-indigo-900",
  IN_PROGRESS: "bg-amber-50 text-amber-950",
  PENDING: "bg-orange-50 text-orange-950",
  RESOLVED: "bg-emerald-50 text-emerald-900",
  CLOSED: "bg-slate-100 text-slate-700",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
