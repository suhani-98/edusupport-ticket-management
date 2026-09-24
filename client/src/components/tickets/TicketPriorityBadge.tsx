import { priorityLabels, type TicketPriority } from "../../types/ticket";

const tones: Record<TicketPriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-sky-50 text-sky-900",
  HIGH: "bg-orange-50 text-orange-950",
  CRITICAL: "bg-red-50 text-red-900 ring-1 ring-red-200",
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[priority]}`}>
      {priorityLabels[priority]}
    </span>
  );
}
