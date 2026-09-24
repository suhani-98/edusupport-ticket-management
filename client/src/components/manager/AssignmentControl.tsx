import { useState } from "react";
import type { StaffUser, TicketPerson, TicketStatus } from "../../types/ticket";
import { Button } from "../ui/Button";

const selectClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:border-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-800";

export function AssignmentControl({
  assignee,
  staff,
  status,
  busy,
  onAssign,
}: {
  assignee: TicketPerson | null;
  staff: StaffUser[];
  status: TicketStatus;
  busy: boolean;
  onAssign: (staffId: string) => Promise<void>;
}) {
  const [staffId, setStaffId] = useState(assignee?.id ?? "");
  const locked = status === "RESOLVED" || status === "CLOSED";
  const unchanged = staffId === (assignee?.id ?? "");

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700">Current assignee: {assignee?.name ?? "Unassigned"}</p>
      <label className="block text-sm font-medium text-slate-800">
        Active staff
        <select
          value={staffId}
          disabled={locked || busy || staff.length === 0}
          onChange={(event) => setStaffId(event.target.value)}
          className={selectClass}
        >
          <option value="">Select staff</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      {locked ? <p className="text-xs text-slate-500">Resolved and closed tickets cannot be assigned.</p> : null}
      {staff.length === 0 ? <p className="text-xs text-slate-500">No active staff are available.</p> : null}
      <Button
        type="button"
        loading={busy}
        disabled={locked || !staffId || unchanged}
        onClick={() => void onAssign(staffId)}
      >
        {assignee ? "Reassign" : "Assign"}
      </Button>
    </div>
  );
}
