import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
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
import { formatDateTime } from "../lib/format";
import { ApiError } from "../services/api";
import { addPublicComment, closeTicket, getActivities, getComments, getTicket, reopenTicket } from "../services/ticket.service";
import { statusLabels, type Activity, type Comment, type TicketDetail } from "../types/ticket";

export function TicketDetailPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const createdTicketNumber = (location.state as { createdTicketNumber?: string } | null)?.createdTicketNumber;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [reopenError, setReopenError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadedId, setLoadedId] = useState("");
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);

  const loadSideData = useCallback(async (ticketId: string) => {
    const [commentResult, activityResult] = await Promise.all([getComments(ticketId), getActivities(ticketId)]);
    setComments(commentResult.comments.filter((comment) => comment.type === "PUBLIC"));
    setActivities(activityResult.activities);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getTicket(id), getComments(id), getActivities(id)])
      .then(([ticketResult, commentResult, activityResult]) => {
        if (!active) {
          return;
        }
        setTicket(ticketResult.ticket);
        setComments(commentResult.comments.filter((comment) => comment.type === "PUBLIC"));
        setActivities(activityResult.activities);
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

  async function onAddComment(message: string) {
    setCommentError("");
    try {
      const response = await addPublicComment(id, message);
      setComments((current) => (current.some((comment) => comment.id === response.comment.id) ? current : [...current, response.comment]));
      const activityResult = await getActivities(id);
      setActivities(activityResult.activities);
      setNotice("Comment added.");
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : "The comment could not be added. Please try again.";
      setCommentError(message);
      throw caught;
    }
  }

  async function onClose() {
    setClosing(true);
    setActionError("");
    try {
      const response = await closeTicket(id);
      setTicket(response.ticket);
      await loadSideData(id);
      setConfirmClose(false);
      setNotice("Ticket closed.");
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "The ticket could not be closed. Please try again.");
    } finally {
      setClosing(false);
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
      setReopenError(caught instanceof ApiError ? caught.message : "The ticket could not be reopened. Please try again.");
      throw caught;
    }
  }

  if (loading) {
    return <LoadingState label="Loading ticket…" />;
  }
  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <Alert>{error || "Unable to load this ticket. Please try again."}</Alert>
        <Link to="/student/tickets" className="text-sm font-semibold text-teal-900 hover:underline">
          Back to my tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/student/tickets" className="text-sm font-semibold text-teal-900 hover:underline">
        Back to my tickets
      </Link>
      {createdTicketNumber ? <Alert tone="success">{`Ticket ${createdTicketNumber} was created.`}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {actionError ? <Alert>{actionError}</Alert> : null}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-teal-900">{ticket.ticketNumber}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{ticket.subject}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
            <TicketSlaBadge slaStatus={ticket.slaStatus} />
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</dt>
            <dd className="mt-1 text-sm text-slate-800">{ticket.category?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current status</dt>
            <dd className="mt-1 text-sm text-slate-800">{statusLabels[ticket.status]}</dd>
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
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolution deadline</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDateTime(ticket.slaDeadline)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stored SLA status</dt>
            <dd className="mt-1 text-sm text-slate-800">This is the status saved by the server. It is not recalculated in the browser.</dd>
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
        {ticket.status === "RESOLVED" ? (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {confirmClose ? (
              <>
                <p className="text-sm text-slate-700">Close this resolved ticket?</p>
                <Button type="button" loading={closing} onClick={onClose}>
                  Close Ticket
                </Button>
                <Button type="button" onClick={() => setConfirmClose(false)} className="bg-slate-700 hover:bg-slate-800">
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => setConfirmClose(true)}>
                Close Ticket
              </Button>
            )}
          </div>
        ) : null}
        {ticket.status === "CLOSED" ? (
          <div className="mt-6">
            <Button type="button" onClick={() => setReopenOpen(true)}>
              Reopen Ticket
            </Button>
          </div>
        ) : null}
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Public comments</h2>
        <div className="mt-4">
          <CommentList comments={comments} />
        </div>
        <div className="mt-6">
          <CommentComposer onSubmit={onAddComment} error={commentError} />
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Activity</h2>
        <div className="mt-4">
          <ActivityTimeline activities={activities} />
        </div>
      </Card>
      <ReopenTicketDialog
        open={reopenOpen}
        error={reopenError}
        onClose={() => setReopenOpen(false)}
        onSubmit={onReopen}
      />
    </div>
  );
}
