import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TicketCard } from "../components/tickets/TicketCard";
import { Alert } from "../components/ui/Alert";
import { Card } from "../components/ui/Card";
import { LoadingState } from "../components/ui/LoadingState";
import { ApiError } from "../services/api";
import { getStudentDashboard } from "../services/dashboard.service";
import type { StudentDashboard } from "../types/ticket";

const countLabels = [
  ["total", "Total tickets"],
  ["open", "Open"],
  ["inProgress", "In progress"],
  ["pending", "Pending"],
  ["resolved", "Resolved"],
  ["closed", "Closed"],
] as const;

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Support home</h1>
          <p className="mt-1 text-sm text-slate-600">Your tickets and SLA status, as stored by the help desk.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/student/tickets/new" className="inline-flex rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800">
            Create Ticket
          </Link>
          <Link to="/student/tickets" className="inline-flex rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800">
            View My Tickets
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {countLabels.map(([key, label]) => (
          <Card key={key} className="p-4">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{data.ticketCounts[key]}</p>
          </Card>
        ))}
        <Card className="p-4">
          <p className="text-sm text-slate-600">Approaching SLA</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{data.slaCounts.approachingSla}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600">SLA breached</p>
          <p className="mt-1 text-2xl font-semibold text-red-800">{data.slaCounts.breached}</p>
        </Card>
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
