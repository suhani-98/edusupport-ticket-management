import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { RESOLUTION_MAX_LENGTH } from "../../types/ticket";
import { dialogClassName } from "../../lib/ui";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/TextArea";

export function ResolveTicketDialog({
  open,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (resolution: string) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [resolution, setResolution] = useState("");
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
    const trimmed = resolution.trim();
    if (!trimmed) {
      setFieldError("Resolution is required.");
      return;
    }
    if (trimmed.length > RESOLUTION_MAX_LENGTH) {
      setFieldError(`Resolution must be at most ${RESOLUTION_MAX_LENGTH} characters.`);
      return;
    }
    setFieldError("");
    setLoading(true);
    try {
      await onSubmit(trimmed);
      setResolution("");
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
          Resolve ticket
        </h2>
        <TextArea
          label="Resolution"
          name="resolution"
          value={resolution}
          rows={5}
          maxLength={RESOLUTION_MAX_LENGTH}
          onChange={(event) => setResolution(event.target.value)}
          error={fieldError}
          required
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Resolve Ticket
          </Button>
        </div>
      </form>
    </dialog>
  );
}
