import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { REOPEN_REASON_MAX_LENGTH } from "../../types/ticket";
import { dialogClassName } from "../../lib/ui";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/TextArea";

export function ReopenTicketDialog({
  open,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setFieldError("Reason is required.");
      return;
    }
    if (trimmed.length > REOPEN_REASON_MAX_LENGTH) {
      setFieldError(`Reason must be at most ${REOPEN_REASON_MAX_LENGTH} characters.`);
      return;
    }
    setFieldError("");
    setLoading(true);
    try {
      await onSubmit(trimmed);
      setReason("");
    } catch {
      setFieldError("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={dialogClassName}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          Reopen ticket
        </h2>
        <p className="text-sm text-slate-600">Tell support why this ticket should be opened again.</p>
        <TextArea
          label="Reason"
          name="reason"
          value={reason}
          rows={4}
          maxLength={REOPEN_REASON_MAX_LENGTH}
          onChange={(event) => setReason(event.target.value)}
          error={fieldError}
          required
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Reopen Ticket
          </Button>
        </div>
      </form>
    </dialog>
  );
}
