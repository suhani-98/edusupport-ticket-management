import { Link } from "react-router-dom";
import type { CategoryCount } from "../../types/ticket";

export function CategoryBreakdown({ rows }: { rows: CategoryCount[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">No tickets have been filed yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.categoryId}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <Link className="font-medium text-teal-900 hover:underline" to={`/manager/tickets?categoryId=${row.categoryId}`}>
              {row.categoryName}
            </Link>
            <span className="text-slate-600">{row.count}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-2 rounded-full bg-teal-800" style={{ width: `${Math.round((row.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
