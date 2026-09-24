import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import { primaryLinkClass } from "../lib/ui";
import { CategoryBreakdown } from "../components/manager/CategoryBreakdown";
import { StaffWorkloadTable } from "../components/manager/StaffWorkloadTable";
import { StaffMetricCard } from "../components/staff/StaffMetricCard";
import { TicketCard } from "../components/tickets/TicketCard";
import { Alert } from "../components/ui/Alert";
import { Card } from "../components/ui/Card";
import { LoadingState } from "../components/ui/LoadingState";
import { ApiError } from "../services/api";
import { getManagerDashboard } from "../services/dashboard.service";
import type { ManagerDashboard } from "../types/ticket";

export function ManagerDashboardPage() {
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getManagerDashboard()
      .then((dashboard) => {
        if (active) {
          setData(dashboard);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load the manager dashboard. Please try again.");
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
    return <LoadingState label="Loading the support overview…" />;
  }
  if (error || !data) {
    return <Alert>{error || "Unable to load the manager dashboard. Please try again."}</Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Support overview" description="Organization-wide tickets, SLA, and staff workload.">
        <Link to="/manager/tickets" className={primaryLinkClass}>
          All Tickets
        </Link>
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StaffMetricCard label="SLA breached" value={data.slaCounts.breached} prominent />
        <StaffMetricCard label="Overdue open" value={data.slaCounts.overdueOpen} prominent />
        <StaffMetricCard label="Pending" value={data.ticketCounts.pending} prominent />
        <StaffMetricCard label="Open escalations" value={data.escalationCounts.open} prominent />
        <StaffMetricCard label="Critical" value={data.priorityCounts.critical} prominent />
        <StaffMetricCard label="Total" value={data.ticketCounts.total} />
        <StaffMetricCard label="Open" value={data.ticketCounts.open} />
        <StaffMetricCard label="Assigned" value={data.ticketCounts.assigned} />
        <StaffMetricCard label="In progress" value={data.ticketCounts.inProgress} />
        <StaffMetricCard label="Resolved" value={data.ticketCounts.resolved} />
        <StaffMetricCard label="Closed" value={data.ticketCounts.closed} />
        <StaffMetricCard label="Within SLA" value={data.slaCounts.withinSla} />
        <StaffMetricCard label="Approaching SLA" value={data.slaCounts.approachingSla} />
        <StaffMetricCard label="Low" value={data.priorityCounts.low} />
        <StaffMetricCard label="Medium" value={data.priorityCounts.medium} />
        <StaffMetricCard label="High" value={data.priorityCounts.high} />
        <StaffMetricCard label="Level 1 escalations" value={data.escalationCounts.level1} />
        <StaffMetricCard label="Level 2 escalations" value={data.escalationCounts.level2} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
          <div className="mt-4">
            <CategoryBreakdown rows={data.categoryCounts} />
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Staff workload</h2>
          <p className="mt-1 text-sm text-slate-600">Staff with at least one assigned ticket.</p>
          <div className="mt-4">
            <StaffWorkloadTable rows={data.staffWorkload} />
          </div>
        </Card>
      </div>
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Recent tickets</h2>
        {data.recentTickets.length === 0 ? (
          <Card className="mt-3">
            <p className="text-sm text-slate-600">No tickets have been filed yet.</p>
          </Card>
        ) : (
          <div className="mt-3 grid gap-3">
            {data.recentTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} href={`/manager/tickets/${ticket.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
