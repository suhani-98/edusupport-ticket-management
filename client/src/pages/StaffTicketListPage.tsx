import { useEffect, useState } from "react";
import { StaffTicketFilters } from "../components/staff/StaffTicketFilters";
import { TicketList } from "../components/tickets/TicketList";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LoadingState } from "../components/ui/LoadingState";
import { ApiError } from "../services/api";
import { getCategories } from "../services/category.service";
import { getAssignedTickets } from "../services/ticket.service";
import { SEARCH_MAX_LENGTH, type Category, type TicketListParams, type TicketListResponse } from "../types/ticket";

const initialFilters: TicketListParams = {
  page: 1,
  limit: 20,
  sortBy: "updatedAt",
  sortOrder: "desc",
};

export function StaffTicketListPage() {
  const [filters, setFilters] = useState<TicketListParams>(initialFilters);
  const [categories, setCategories] = useState<Category[]>([]);
  const [result, setResult] = useState<TicketListResponse | null>(null);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = JSON.stringify(filters);
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let active = true;
    getCategories()
      .then((response) => {
        if (active) {
          setCategories(response.categories.filter((category) => category.isActive));
        }
      })
      .catch(() => {
        if (active) {
          setCategories([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const search = filters.search?.trim();
    getAssignedTickets({
      ...filters,
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
          setError(caught instanceof ApiError ? caught.message : "Unable to load your tickets. Please try again.");
          setLoadedKey(requestKey);
        }
      });
    return () => {
      active = false;
    };
  }, [filters, requestKey]);

  const hasFilters = Boolean(
    filters.search || filters.status || filters.priority || filters.slaStatus || filters.categoryId || filters.overdue !== undefined,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Assigned tickets</h1>
        <p className="mt-1 text-sm text-slate-600">Only tickets assigned to you are listed.</p>
      </div>
      <StaffTicketFilters value={filters} categories={categories} onChange={setFilters} onClear={() => setFilters(initialFilters)} />
      {error ? <Alert>{error}</Alert> : null}
      {loading ? <LoadingState label="Loading assigned tickets…" /> : null}
      {!loading && !error && result && result.tickets.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-700">
            {hasFilters ? "No assigned tickets match these filters." : "No tickets are currently assigned to you."}
          </p>
        </Card>
      ) : null}
      {!loading && result && result.tickets.length > 0 ? (
        <TicketList tickets={result.tickets} hrefFor={(id) => `/staff/tickets/${id}`} showAge />
      ) : null}
      {result && result.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            disabled={result.pagination.page <= 1}
            onClick={() => setFilters((current) => ({ ...current, page: (current.page ?? 1) - 1 }))}
            variant="secondary"
          >
            Previous
          </Button>
          <p className="text-sm text-slate-600">
            Page {result.pagination.page} of {result.pagination.totalPages}
          </p>
          <Button
            type="button"
            disabled={result.pagination.page >= result.pagination.totalPages}
            onClick={() => setFilters((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}
            variant="secondary"
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
