import { formatDateTime } from "../../lib/format";
import type { Comment } from "../../types/ticket";

export function CommentList({
  comments,
  type = "PUBLIC",
  emptyLabel = "No public comments yet.",
}: {
  comments: Comment[];
  type?: Comment["type"];
  emptyLabel?: string;
}) {
  const visible = comments.filter((comment) => comment.type === type);
  if (visible.length === 0) {
    return <p className="text-sm text-slate-600">{emptyLabel}</p>;
  }
  return (
    <ol className="space-y-3">
      {visible.map((comment) => (
        <li key={comment.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{comment.author?.name ?? "Support desk"}</p>
            <time className="text-xs text-slate-500" dateTime={comment.createdAt}>
              {formatDateTime(comment.createdAt)}
            </time>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{comment.message}</p>
        </li>
      ))}
    </ol>
  );
}
