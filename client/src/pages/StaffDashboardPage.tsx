import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StaffMetricCard } from "../components/staff/StaffMetricCard";
import { TicketCard } from "../components/tickets/TicketCard";
import { Alert } from "../components/ui/Alert";
import { Card } from "../components/ui/Card";
import { LoadingState } from "../components/ui/LoadingState";
import { ApiError } from "../services/api";
import { getStaffDashboard } from "../services/dashboard.service";
import type { StaffDashboard } from "../types/ticket";

export function StaffDashboardPage() {
  const [data, setData] = useState<StaffDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getStaffDashboard()
      .then((dashboard) => {
        if (active) {
          setData(dashboard);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load your dashboard. Please try again.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingState label="Loading your dashboard…" />;
  }
  if (error || !data) {
    return <Alert>{error || "Unable to load your dashboard. Please try again."}</Alert>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Staff desk</h1>
          <p className="mt-1 text-sm text-slate-600">Tickets assigned to you, with SLA and escalation counts from the server.</p>
        </div>
        <Link
          to="/staff/tickets"
          className="inline-flex rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
        >
          Assigned Tickets
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StaffMetricCard label="In progress" value={data.ticketCounts.inProgress} prominent />
        <StaffMetricCard label="Pending" value={data.ticketCounts.pending} prominent />
        <StaffMetricCard label="Approaching SLA" value={data.slaCounts.approachingSla} prominent />
        <StaffMetricCard label="SLA breached" value={data.slaCounts.breached} prominent />
        <StaffMetricCard label="Overdue open" value={data.slaCounts.overdueOpen} prominent />
        <StaffMetricCard label="Open escalations" value={data.escalationCounts.open} prominent />
        <StaffMetricCard label="Assigned" value={data.ticketCounts.assigned} />
        <StaffMetricCard label="Resolved" value={data.ticketCounts.resolved} />
        <StaffMetricCard label="Closed" value={data.ticketCounts.closed} />
        <StaffMetricCard label="Within SLA" value={data.slaCounts.withinSla} />
        <StaffMetricCard label="Level 1 escalations" value={data.escalationCounts.level1} />
        <StaffMetricCard label="Level 2 escalations" value={data.escalationCounts.level2} />
      </div>
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Recent assigned tickets</h2>
        {data.recentTickets.length === 0 ? (
          <Card className="mt-3">
            <p className="text-sm text-slate-600">No tickets are currently assigned to you.</p>
          </Card>
        ) : (
          <div className="mt-3 grid gap-3">
            {data.recentTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} href={`/staff/tickets/${ticket.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
