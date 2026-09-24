import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StaffTicketFilters } from "../components/staff/StaffTicketFilters";
import { TicketList } from "../components/tickets/TicketList";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LoadingState } from "../components/ui/LoadingState";
import { ApiError } from "../services/api";
import { getCategories } from "../services/category.service";
import { getAllTickets } from "../services/ticket.service";
import { getAssignableStaff } from "../services/user.service";
import {
  SEARCH_MAX_LENGTH,
  slaStatuses,
  ticketPriorities,
  ticketStatuses,
  type Category,
  type SlaStatus,
  type StaffUser,
  type TicketListParams,
  type TicketListResponse,
  type TicketPriority,
  type TicketStatus,
} from "../types/ticket";

function readFilters(params: URLSearchParams): TicketListParams {
  const status = params.get("status");
  const priority = params.get("priority");
  const slaStatus = params.get("slaStatus");
  const overdue = params.get("overdue");
  const sortBy = params.get("sortBy");
  const sortOrder = params.get("sortOrder");
  const page = Number(params.get("page") ?? "1");
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: 20,
    search: params.get("search") ?? undefined,
    status: ticketStatuses.includes(status as TicketStatus) ? (status as TicketStatus) : undefined,
    priority: ticketPriorities.includes(priority as TicketPriority) ? (priority as TicketPriority) : undefined,
    slaStatus: slaStatuses.includes(slaStatus as SlaStatus) ? (slaStatus as SlaStatus) : undefined,
    categoryId: params.get("categoryId") ?? undefined,
    assignedTo: params.get("assignedTo") ?? undefined,
    overdue: overdue === "true" ? true : overdue === "false" ? false : undefined,
    sortBy: sortBy === "updatedAt" || sortBy === "ticketNumber" || sortBy === "createdAt" ? sortBy : "updatedAt",
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  };
}

function writeFilters(filters: TicketListParams): URLSearchParams {
  const params = new URLSearchParams();
  const entries: Array<[string, string | number | boolean | undefined]> = [
    ["search", filters.search],
    ["status", filters.status],
    ["priority", filters.priority],
    ["slaStatus", filters.slaStatus],
    ["categoryId", filters.categoryId],
    ["assignedTo", filters.assignedTo],
    ["overdue", filters.overdue === undefined ? undefined : String(filters.overdue)],
    ["sortBy", filters.sortBy],
    ["sortOrder", filters.sortOrder],
    ["page", filters.page && filters.page > 1 ? filters.page : undefined],
  ];
  for (const [key, value] of entries) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  return params;
}

export function ManagerTicketListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [result, setResult] = useState<TicketListResponse | null>(null);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = searchParams.toString();
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let active = true;
    Promise.all([getCategories(), getAssignableStaff()])
      .then(([categoryResult, staffResult]) => {
        if (!active) {
          return;
        }
        setCategories(categoryResult.categories.filter((category) => category.isActive));
        setStaff(staffResult.users);
      })
      .catch(() => {
        if (active) {
          setCategories([]);
          setStaff([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const current = readFilters(searchParams);
    const search = current.search?.trim();
    getAllTickets({
      ...current,
      search: search ? search.slice(0, SEARCH_MAX_LENGTH) : undefined,
    })
      .then((response) => {
        if (active) {
          setResult(response);
          setError("");
          setLoadedKey(requestKey);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setResult(null);
          setError(caught instanceof ApiError ? caught.message : "Unable to load tickets. Please try again.");
          setLoadedKey(requestKey);
        }
      });
    return () => {
      active = false;
    };
  }, [requestKey, searchParams]);

  const hasFilters = Boolean(
    filters.search || filters.status || filters.priority || filters.slaStatus || filters.categoryId || filters.assignedTo || filters.overdue !== undefined,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">All tickets</h1>
        <p className="mt-1 text-sm text-slate-600">Every support request in the organization.</p>
      </div>
      <StaffTicketFilters
        value={filters}
        categories={categories}
        staff={staff}
        showStaffFilter
        onChange={(next) => setSearchParams(writeFilters(next))}
        onClear={() => setSearchParams(new URLSearchParams())}
      />
      {error ? <Alert>{error}</Alert> : null}
      {loading ? <LoadingState label="Loading tickets…" /> : null}
      {!loading && !error && result && result.tickets.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-700">{hasFilters ? "No tickets match these filters." : "No tickets have been filed yet."}</p>
        </Card>
      ) : null}
      {!loading && result && result.tickets.length > 0 ? (
        <TicketList tickets={result.tickets} hrefFor={(id) => `/manager/tickets/${id}`} showAge showAssignee />
      ) : null}
      {result && result.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            disabled={result.pagination.page <= 1}
            onClick={() => setSearchParams(writeFilters({ ...filters, page: result.pagination.page - 1 }))}
            className="bg-slate-700 hover:bg-slate-800"
          >
            Previous
          </Button>
          <p className="text-sm text-slate-600">
            Page {result.pagination.page} of {result.pagination.totalPages}
          </p>
          <Button
            type="button"
            disabled={result.pagination.page >= result.pagination.totalPages}
            onClick={() => setSearchParams(writeFilters({ ...filters, page: result.pagination.page + 1 }))}
            className="bg-slate-700 hover:bg-slate-800"
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
