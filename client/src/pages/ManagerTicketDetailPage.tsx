import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AssignmentControl } from "../components/manager/AssignmentControl";
import { EscalationPanel } from "../components/staff/EscalationPanel";
import { PriorityControl } from "../components/staff/PriorityControl";
import { ResolveTicketDialog } from "../components/staff/ResolveTicketDialog";
import { TicketWorkflowActions } from "../components/staff/TicketWorkflowActions";
import { ActivityTimeline } from "../components/tickets/ActivityTimeline";
import { CommentComposer } from "../components/tickets/CommentComposer";
import { CommentList } from "../components/tickets/CommentList";
import { ReopenTicketDialog } from "../components/tickets/ReopenTicketDialog";
import { TicketPriorityBadge } from "../components/tickets/TicketPriorityBadge";
import { TicketSlaBadge } from "../components/tickets/TicketSlaBadge";
import { TicketStatusBadge } from "../components/tickets/TicketStatusBadge";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LoadingState } from "../components/ui/LoadingState";
import { deadlineHasPassed, formatAge, formatDateTime } from "../lib/format";
import { ApiError } from "../services/api";
import {
  addComment,
  assignTicket,
  closeTicket,
  escalateTicket,
  getActivities,
  getComments,
  getEscalations,
  getTicket,
  refreshTicketSla,
  reopenTicket,
  resolveEscalation,
  resolveTicket,
  updateTicketPriority,
  updateTicketStatus,
} from "../services/ticket.service";
import { getAssignableStaff } from "../services/user.service";
import {
  slaLabels,
  statusLabels,
  type Activity,
  type Comment,
  type Escalation,
  type StaffUser,
  type TicketDetail,
  type TicketPriority,
  type TicketStatus,
} from "../types/ticket";

export function ManagerTicketDetailPage() {
  const { id = "" } = useParams();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [publicError, setPublicError] = useState("");
  const [internalError, setInternalError] = useState("");
  const [escalationError, setEscalationError] = useState("");
  const [resolveError, setResolveError] = useState("");
  const [reopenError, setReopenError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadedId, setLoadedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const loadSideData = useCallback(async (ticketId: string) => {
    const [commentResult, activityResult, escalationResult] = await Promise.all([
      getComments(ticketId),
      getActivities(ticketId),
      getEscalations(ticketId),
    ]);
    setComments(commentResult.comments);
    setActivities(activityResult.activities);
    setEscalations(escalationResult.escalations);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getTicket(id), getComments(id), getActivities(id), getEscalations(id), getAssignableStaff()])
      .then(([ticketResult, commentResult, activityResult, escalationResult, staffResult]) => {
        if (!active) {
          return;
        }
        setTicket(ticketResult.ticket);
        setComments(commentResult.comments);
        setActivities(activityResult.activities);
        setEscalations(escalationResult.escalations);
        setStaff(staffResult.users);
        setError("");
        setLoadedId(id);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load this ticket. Please try again.");
          setLoadedId(id);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  const loading = loadedId !== id;
  const deadlinePassed = ticket ? deadlineHasPassed(ticket.slaDeadline) && ticket.status !== "CLOSED" : false;

  async function onStatus(status: TicketStatus) {
    setBusy(true);
    setActionError("");
    try {
      const response = await updateTicketStatus(id, status);
      setTicket(response.ticket);
      await loadSideData(id);
      setNotice("Status updated.");
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Unable to update ticket status.");
    } finally {
      setBusy(false);
    }
  }

  async function onAssign(staffId: string) {
    setBusy(true);
    setActionError("");
    try {
      const response = await assignTicket(id, staffId);
      setTicket(response.ticket);
      await loadSideData(id);
      setNotice(ticket?.assignedTo ? "Ticket reassigned." : "Ticket assigned.");
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Unable to assign this ticket.");
    } finally {
      setBusy(false);
    }
  }

  async function onPriority(priority: TicketPriority) {
    if (!ticket || priority === ticket.priority) {
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const response = await updateTicketPriority(id, priority);
      setTicket(response.ticket);
      await loadSideData(id);
      setNotice("Priority updated. The SLA deadline was recalculated by the server.");
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Unable to update priority.");
    } finally {
      setBusy(false);
    }
  }

  async function onResolve(resolution: string) {
    setResolveError("");
    try {
      const response = await resolveTicket(id, resolution);
      setTicket(response.ticket);
      await loadSideData(id);
      setResolveOpen(false);
      setNotice("Ticket resolved.");
    } catch (caught) {
      setResolveError(caught instanceof ApiError ? caught.message : "Unable to resolve this ticket.");
      throw caught;
    }
  }

  async function onClose() {
    setBusy(true);
    setActionError("");
    try {
      const response = await closeTicket(id);
      setTicket(response.ticket);
      await loadSideData(id);
      setConfirmClose(false);
      setNotice("Ticket closed.");
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Unable to close this ticket.");
    } finally {
      setBusy(false);
    }
  }

  async function onReopen(reason: string) {
    setReopenError("");
    try {
      const response = await reopenTicket(id, reason);
      setTicket(response.ticket);
      await loadSideData(id);
      setReopenOpen(false);
      setNotice("Ticket reopened.");
    } catch (caught) {
      setReopenError(caught instanceof ApiError ? caught.message : "Unable to reopen this ticket.");
      throw caught;
    }
  }

  async function onRefreshSla() {
    setBusy(true);
    setActionError("");
    try {
      const response = await refreshTicketSla(id);
      setTicket(response.ticket);
      await loadSideData(id);
      setNotice(
        response.ticket.slaStatus === "BREACHED"
          ? "SLA refreshed. Stored status is SLA Breached."
          : `SLA refreshed. Stored status is ${slaLabels[response.ticket.slaStatus]}.`,
      );
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Unable to refresh SLA.");
    } finally {
      setBusy(false);
    }
  }

  async function onComment(message: string, type: "PUBLIC" | "INTERNAL") {
    const setErrorForType = type === "PUBLIC" ? setPublicError : setInternalError;
    setErrorForType("");
    try {
      const response = await addComment(id, message, type);
      setComments((current) => (current.some((comment) => comment.id === response.comment.id) ? current : [...current, response.comment]));
      const activityResult = await getActivities(id);
      setActivities(activityResult.activities);
      setNotice(type === "PUBLIC" ? "Reply sent to the student." : "Internal note added.");
    } catch (caught) {
      setErrorForType(caught instanceof ApiError ? caught.message : "The comment could not be added.");
      throw caught;
    }
  }

  async function onEscalate(reason: string) {
    setBusy(true);
    setEscalationError("");
    try {
      const response = await escalateTicket(id, reason);
      setTicket(response.ticket);
      await loadSideData(id);
      setNotice("Ticket escalated.");
    } catch (caught) {
      setEscalationError(caught instanceof ApiError ? caught.message : "Unable to escalate this ticket.");
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  async function onResolveEscalation(escalationId: string) {
    setBusy(true);
    setEscalationError("");
    try {
      const response = await resolveEscalation(id, escalationId);
      setTicket(response.ticket);
      await loadSideData(id);
      setNotice("Escalation resolved.");
    } catch (caught) {
      setEscalationError(caught instanceof ApiError ? caught.message : "Unable to resolve this escalation.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading ticket…" />;
  }
  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <Alert>{error || "Unable to load this ticket. Please try again."}</Alert>
        <Link to="/manager/tickets" className="text-sm font-semibold text-teal-900 hover:underline">
          Back to all tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/manager/tickets" className="text-sm font-semibold text-teal-900 hover:underline">
        Back to all tickets
      </Link>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {actionError ? <Alert>{actionError}</Alert> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="space-y-6">
          <Card>
            <p className="text-sm font-semibold text-teal-900">{ticket.ticketNumber}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{ticket.subject}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
              <TicketSlaBadge slaStatus={ticket.slaStatus} />
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student</dt>
                <dd className="mt-1 text-sm text-slate-800">{ticket.student?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</dt>
                <dd className="mt-1 text-sm text-slate-800">{ticket.category?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
                <dd className="mt-1 text-sm text-slate-800">{statusLabels[ticket.status]}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignee</dt>
                <dd className="mt-1 text-sm text-slate-800">{ticket.assignedTo?.name ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
                <dd className="mt-1 text-sm text-slate-800">{formatDateTime(ticket.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</dt>
                <dd className="mt-1 text-sm text-slate-800">{formatDateTime(ticket.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket age</dt>
                <dd className="mt-1 text-sm text-slate-800">Age: {formatAge(ticket.createdAt)}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-900">Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{ticket.description}</p>
            </div>
            {ticket.resolution ? (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-slate-900">Resolution</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{ticket.resolution}</p>
              </div>
            ) : null}
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Reply to student</h2>
            <div className="mt-4">
              <CommentList comments={comments} type="PUBLIC" />
            </div>
            <div className="mt-6">
              <CommentComposer label="Public reply" buttonLabel="Reply to student" error={publicError} onSubmit={(message) => onComment(message, "PUBLIC")} />
            </div>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <h2 className="text-lg font-semibold text-slate-900">Internal notes</h2>
            <p className="mt-1 text-sm text-slate-700">Students cannot see these notes.</p>
            <div className="mt-4">
              <CommentList comments={comments} type="INTERNAL" emptyLabel="No internal notes yet." />
            </div>
            <div className="mt-6">
              <CommentComposer label="Internal note" buttonLabel="Add internal note" error={internalError} onSubmit={(message) => onComment(message, "INTERNAL")} />
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Activity</h2>
            <div className="mt-4">
              <ActivityTimeline activities={activities} audience="staff" />
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">SLA</h2>
            <p className="mt-2 text-sm text-slate-700">SLA: {slaLabels[ticket.slaStatus]}</p>
            <p className="mt-1 text-sm text-slate-700">Resolution deadline: {formatDateTime(ticket.slaDeadline)}</p>
            {deadlinePassed ? <p className="mt-2 text-sm font-medium text-red-800">The resolution deadline has passed.</p> : null}
            <p className="mt-2 text-xs text-slate-500">The badge uses the stored SLA status. Refresh asks the server to recompute it.</p>
            <div className="mt-4">
              <Button type="button" loading={busy} onClick={onRefreshSla} className="bg-slate-800 hover:bg-slate-900">
                Refresh SLA
              </Button>
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Assignment</h2>
            <div className="mt-4">
              <AssignmentControl
                key={ticket.assignedTo?.id ?? "unassigned"}
                assignee={ticket.assignedTo}
                staff={staff}
                status={ticket.status}
                busy={busy}
                onAssign={onAssign}
              />
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Workflow</h2>
            <div className="mt-4 space-y-4">
              <TicketWorkflowActions
                status={ticket.status}
                loading={busy}
                showAssign={Boolean(ticket.assignedTo)}
                onStatus={onStatus}
                onResolve={() => setResolveOpen(true)}
                onClose={() => setConfirmClose(true)}
                onReopen={() => setReopenOpen(true)}
              />
              {confirmClose ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-700">Close this resolved ticket?</p>
                  <Button type="button" loading={busy} onClick={onClose}>
                    Confirm close
                  </Button>
                  <Button type="button" onClick={() => setConfirmClose(false)} className="bg-slate-700 hover:bg-slate-800">
                    Cancel
                  </Button>
                </div>
              ) : null}
              <PriorityControl priority={ticket.priority} status={ticket.status} disabled={busy} onChange={onPriority} />
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Escalation</h2>
            <div className="mt-4">
              <EscalationPanel escalations={escalations} error={escalationError} busy={busy} onEscalate={onEscalate} onResolve={onResolveEscalation} />
            </div>
          </Card>
        </div>
      </div>
      <ResolveTicketDialog open={resolveOpen} error={resolveError} onClose={() => setResolveOpen(false)} onSubmit={onResolve} />
      <ReopenTicketDialog open={reopenOpen} error={reopenError} onClose={() => setReopenOpen(false)} onSubmit={onReopen} />
    </div>
  );
}
