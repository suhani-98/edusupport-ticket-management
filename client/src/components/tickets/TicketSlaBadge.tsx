import { slaLabels, type SlaStatus } from "../../types/ticket";

const tones: Record<SlaStatus, string> = {
  WITHIN_SLA: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
  APPROACHING_SLA: "bg-amber-50 text-amber-950 ring-1 ring-amber-200",
  BREACHED: "bg-red-50 text-red-900 ring-1 ring-red-200",
};

export function TicketSlaBadge({ slaStatus }: { slaStatus: SlaStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[slaStatus]}`}>
      {slaLabels[slaStatus]}
    </span>
  );
}
