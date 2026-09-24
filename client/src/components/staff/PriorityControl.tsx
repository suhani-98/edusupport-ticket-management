import { priorityLabels, ticketPriorities, type TicketPriority, type TicketStatus } from "../../types/ticket";

const selectClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:border-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-800";

export function PriorityControl({
  priority,
  status,
  disabled,
  onChange,
}: {
  priority: TicketPriority;
  status: TicketStatus;
  disabled: boolean;
  onChange: (priority: TicketPriority) => void;
}) {
  const locked = status === "RESOLVED" || status === "CLOSED";
  return (
    <label className="block text-sm font-medium text-slate-800">
      Priority
      <select
        value={priority}
        disabled={disabled || locked}
        onChange={(event) => onChange(event.target.value as TicketPriority)}
        className={selectClass}
      >
        {ticketPriorities.map((item) => (
          <option key={item} value={item}>
            {priorityLabels[item]}
          </option>
        ))}
      </select>
      {locked ? <span className="mt-1 block text-xs font-normal text-slate-500">Priority is locked after resolve or close.</span> : null}
    </label>
  );
}
