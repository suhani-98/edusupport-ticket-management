import { slaLabels, type SlaStatus } from "../../types/ticket";

const tones: Record<SlaStatus, string> = {
  WITHIN_SLA: "bg-emerald-50 text-emerald-900",
  APPROACHING_SLA: "bg-amber-50 text-amber-950",
  BREACHED: "bg-red-50 text-red-900",
};

export function TicketSlaBadge({ slaStatus }: { slaStatus: SlaStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[slaStatus]}`}>
      SLA: {slaLabels[slaStatus]}
    </span>
  );
}
