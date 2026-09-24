import { useState, type FormEvent } from "react";
import { formatDateTime } from "../../lib/format";
import { ESCALATION_REASON_MAX_LENGTH, type Escalation } from "../../types/ticket";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/TextArea";

const levelLabels = { LEVEL_1: "Level 1", LEVEL_2: "Level 2" } as const;

export function EscalationPanel({
  escalations,
  error,
  busy,
  onEscalate,
  onResolve,
}: {
  escalations: Escalation[];
  error: string;
  busy: boolean;
  onEscalate: (reason: string) => Promise<void>;
  onResolve: (escalationId: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState("");
  const openLevel2 = escalations.some((item) => item.status === "OPEN" && item.level === "LEVEL_2");
  const openLevel1 = escalations.some((item) => item.status === "OPEN" && item.level === "LEVEL_1");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setFieldError("Reason is required.");
      return;
    }
    if (trimmed.length > ESCALATION_REASON_MAX_LENGTH) {
      setFieldError(`Reason must be at most ${ESCALATION_REASON_MAX_LENGTH} characters.`);
      return;
    }
    setFieldError("");
    try {
      await onEscalate(trimmed);
      setReason("");
    } catch {
      setFieldError("");
    }
  }

  return (
    <div className="space-y-4">
      {escalations.length === 0 ? <p className="text-sm text-slate-600">No escalations yet.</p> : null}
      <ol className="space-y-3">
        {escalations.map((item) => (
          <li key={item.id} className="rounded-lg border border-slate-200 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {levelLabels[item.level]} · {item.status === "OPEN" ? "Open" : "Resolved"}
              </p>
              <time className="text-xs text-slate-500" dateTime={item.createdAt}>
                {formatDateTime(item.createdAt)}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{item.reason}</p>
            <p className="mt-2 text-xs text-slate-500">
              {item.triggeredBy?.name ? `Raised by ${item.triggeredBy.name}` : "Raised by staff"}
              {item.resolvedAt ? ` · Resolved ${formatDateTime(item.resolvedAt)}` : ""}
            </p>
            {item.status === "OPEN" ? (
              <div className="mt-3">
                <Button type="button" loading={busy} onClick={() => void onResolve(item.id)}>
                  Resolve escalation
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      {openLevel1 && !openLevel2 ? (
        <p className="text-sm text-slate-700">Level 1 is already open. The next escalation becomes Level 2.</p>
      ) : null}
      {openLevel2 ? <p className="text-sm text-slate-700">An open Level 2 escalation already exists.</p> : null}
      <form onSubmit={handleSubmit} className="space-y-3">
        <TextArea
          label="Escalation reason"
          name="escalationReason"
          value={reason}
          rows={3}
          maxLength={ESCALATION_REASON_MAX_LENGTH}
          onChange={(event) => setReason(event.target.value)}
          error={fieldError}
          disabled={openLevel2 || busy}
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" loading={busy} disabled={openLevel2}>
          Escalate ticket
        </Button>
      </form>
    </div>
  );
}
