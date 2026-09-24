import { Button } from "../ui/Button";
import type { TicketStatus } from "../../types/ticket";

const nextActions: Partial<Record<TicketStatus, { status: TicketStatus; label: string }>> = {
  ASSIGNED: { status: "IN_PROGRESS", label: "Start work" },
  IN_PROGRESS: { status: "PENDING", label: "Mark pending" },
  PENDING: { status: "IN_PROGRESS", label: "Resume work" },
};

export function TicketWorkflowActions({
  status,
  loading,
  onStatus,
  onResolve,
}: {
  status: TicketStatus;
  loading: boolean;
  onStatus: (status: TicketStatus) => void;
  onResolve: () => void;
}) {
  const action = nextActions[status];
  const canResolve = status === "IN_PROGRESS";
  if (!action && !canResolve) {
    return <p className="text-sm text-slate-600">No staff status change is available for this ticket.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {action ? (
        <Button type="button" loading={loading} onClick={() => onStatus(action.status)}>
          {action.label}
        </Button>
      ) : null}
      {canResolve ? (
        <Button type="button" onClick={onResolve} className="bg-slate-800 hover:bg-slate-900">
          Resolve Ticket
        </Button>
      ) : null}
    </div>
  );
}
