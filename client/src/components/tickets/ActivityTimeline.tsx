import { activityCopy } from "../../lib/activityCopy";
import { formatDateTime } from "../../lib/format";
import type { Activity } from "../../types/ticket";

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  const items = activities
    .map((activity) => ({ activity, copy: activityCopy(activity) }))
    .filter((item): item is { activity: Activity; copy: { title: string; detail?: string } } => item.copy !== null);

  if (items.length === 0) {
    return <p className="text-sm text-slate-600">No activity yet.</p>;
  }

  return (
    <ol className="space-y-0 border-l border-slate-200 pl-4">
      {items.map(({ activity, copy }) => (
        <li key={activity.id} className="relative pb-5 last:pb-0">
          <span className="absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full bg-teal-800" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-900">{copy.title}</p>
          {copy.detail ? <p className="mt-1 text-sm text-slate-700">{copy.detail}</p> : null}
          <p className="mt-1 text-xs text-slate-500">
            {activity.actor?.name ? `${activity.actor.name} · ` : ""}
            <time dateTime={activity.createdAt}>{formatDateTime(activity.createdAt)}</time>
          </p>
        </li>
      ))}
    </ol>
  );
}
