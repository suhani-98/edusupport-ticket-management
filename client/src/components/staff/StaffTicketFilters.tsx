import {
  priorityLabels,
  slaLabels,
  statusLabels,
  ticketPriorities,
  ticketStatuses,
  slaStatuses,
  SEARCH_MAX_LENGTH,
  type Category,
  type TicketListParams,
} from "../../types/ticket";
import { Button } from "../ui/Button";

const selectClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:border-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-800";

export function StaffTicketFilters({
  value,
  categories,
  onChange,
  onClear,
}: {
  value: TicketListParams;
  categories: Category[];
  onChange: (next: TicketListParams) => void;
  onClear: () => void;
}) {
  return (
    <form
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        onChange({ ...value, page: 1 });
      }}
    >
      <label className="block text-sm font-medium text-slate-800 sm:col-span-2 lg:col-span-3">
        Search
        <input
          name="search"
          value={value.search ?? ""}
          maxLength={SEARCH_MAX_LENGTH}
          onChange={(event) => onChange({ ...value, search: event.target.value, page: 1 })}
          placeholder="Subject or ticket number"
          className={selectClass}
        />
      </label>
      <label className="block text-sm font-medium text-slate-800">
        Status
        <select
          value={value.status ?? ""}
          onChange={(event) =>
            onChange({ ...value, status: event.target.value ? (event.target.value as TicketListParams["status"]) : undefined, page: 1 })
          }
          className={selectClass}
        >
          <option value="">All statuses</option>
          {ticketStatuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-800">
        Priority
        <select
          value={value.priority ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              priority: event.target.value ? (event.target.value as TicketListParams["priority"]) : undefined,
              page: 1,
            })
          }
          className={selectClass}
        >
          <option value="">All priorities</option>
          {ticketPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {priorityLabels[priority]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-800">
        Category
        <select
          value={value.categoryId ?? ""}
          onChange={(event) => onChange({ ...value, categoryId: event.target.value || undefined, page: 1 })}
          className={selectClass}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-800">
        SLA
        <select
          value={value.slaStatus ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              slaStatus: event.target.value ? (event.target.value as TicketListParams["slaStatus"]) : undefined,
              page: 1,
            })
          }
          className={selectClass}
        >
          <option value="">All SLA states</option>
          {slaStatuses.map((status) => (
            <option key={status} value={status}>
              {slaLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-800">
        Overdue
        <select
          value={value.overdue === undefined ? "" : String(value.overdue)}
          onChange={(event) =>
            onChange({
              ...value,
              overdue: event.target.value === "" ? undefined : event.target.value === "true",
              page: 1,
            })
          }
          className={selectClass}
        >
          <option value="">Any deadline</option>
          <option value="true">Overdue open</option>
          <option value="false">Not overdue</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-800">
        Sort
        <select
          value={`${value.sortBy ?? "createdAt"}:${value.sortOrder ?? "desc"}`}
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(":");
            onChange({
              ...value,
              sortBy: sortBy as TicketListParams["sortBy"],
              sortOrder: sortOrder as TicketListParams["sortOrder"],
              page: 1,
            });
          }}
          className={selectClass}
        >
          <option value="createdAt:desc">Newest created</option>
          <option value="createdAt:asc">Oldest created</option>
          <option value="updatedAt:desc">Recently updated</option>
          <option value="ticketNumber:asc">Ticket number</option>
        </select>
      </label>
      <div className="flex items-end gap-2">
        <Button type="submit">Search</Button>
        <Button type="button" onClick={onClear} className="bg-slate-700 hover:bg-slate-800">
          Clear filters
        </Button>
      </div>
    </form>
  );
}
