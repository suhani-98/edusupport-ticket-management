import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StaffMetricCard } from "../components/staff/StaffMetricCard";
import { TicketCard } from "../components/tickets/TicketCard";
import { Alert } from "../components/ui/Alert";
import { Card } from "../components/ui/Card";
import { LoadingState } from "../components/ui/LoadingState";
import { PageHeader } from "../components/ui/PageHeader";
import { primaryLinkClass, secondaryLinkClass } from "../lib/ui";
import { ApiError } from "../services/api";
import { getStudentDashboard } from "../services/dashboard.service";
import type { StudentDashboard } from "../types/ticket";

export function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getStudentDashboard()
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
      <PageHeader title="Support home" description="Your tickets and SLA status, as stored by the help desk.">
        <Link to="/student/tickets/new" className={primaryLinkClass}>
          Create Ticket
        </Link>
        <Link to="/student/tickets" className={secondaryLinkClass}>
          View My Tickets
        </Link>
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StaffMetricCard label="Total tickets" value={data.ticketCounts.total} />
        <StaffMetricCard label="Open" value={data.ticketCounts.open} />
        <StaffMetricCard label="In progress" value={data.ticketCounts.inProgress} />
        <StaffMetricCard label="Pending" value={data.ticketCounts.pending} prominent />
        <StaffMetricCard label="Resolved" value={data.ticketCounts.resolved} />
        <StaffMetricCard label="Closed" value={data.ticketCounts.closed} />
        <StaffMetricCard label="Approaching SLA" value={data.slaCounts.approachingSla} prominent />
        <StaffMetricCard label="Breached" value={data.slaCounts.breached} prominent />
      </div>
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Recent tickets</h2>
        {data.recentTickets.length === 0 ? (
          <Card className="mt-3">
            <p className="text-sm text-slate-600">You don&apos;t have any support tickets yet.</p>
            <Link to="/student/tickets/new" className="mt-4 inline-block text-sm font-semibold text-teal-900 hover:underline">
              Create your first ticket
            </Link>
          </Card>
        ) : (
          <div className="mt-3 grid gap-3">
            {data.recentTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
