import { useState, type FormEvent } from "react";
import { COMMENT_MAX_LENGTH } from "../../types/ticket";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/TextArea";

export function CommentComposer({
  onSubmit,
  error,
  label = "Public comment",
  buttonLabel = "Add Comment",
}: {
  onSubmit: (message: string) => Promise<void>;
  error: string;
  label?: string;
  buttonLabel?: string;
}) {
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setFieldError("Comment is required.");
      return;
    }
    if (trimmed.length > COMMENT_MAX_LENGTH) {
      setFieldError(`Comment must be at most ${COMMENT_MAX_LENGTH} characters.`);
      return;
    }
    setFieldError("");
    setLoading(true);
    try {
      await onSubmit(trimmed);
      setMessage("");
    } catch {
      setFieldError("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <TextArea
        label={label}
        name="comment"
        value={message}
        maxLength={COMMENT_MAX_LENGTH}
        rows={4}
        onChange={(event) => setMessage(event.target.value)}
        error={fieldError}
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" loading={loading}>
        {buttonLabel}
      </Button>
    </form>
  );
}
