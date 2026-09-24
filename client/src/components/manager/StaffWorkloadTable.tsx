import { Link } from "react-router-dom";
import type { StaffWorkload } from "../../types/ticket";

export function StaffWorkloadTable({ rows }: { rows: StaffWorkload[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">No staff member has an assigned ticket yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-2 py-2 font-semibold">Staff</th>
            <th className="px-2 py-2 font-semibold">Assigned</th>
            <th className="px-2 py-2 font-semibold">In progress</th>
            <th className="px-2 py-2 font-semibold">Pending</th>
            <th className="px-2 py-2 font-semibold">Breached</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.staffId} className="border-t border-slate-100">
              <td className="px-2 py-2">
                <Link className="font-medium text-teal-900 hover:underline" to={`/manager/tickets?assignedTo=${row.staffId}`}>
                  {row.name}
                </Link>
              </td>
              <td className="px-2 py-2">{row.assigned}</td>
              <td className="px-2 py-2">{row.inProgress}</td>
              <td className="px-2 py-2">{row.pending}</td>
              <td className="px-2 py-2">{row.breached}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
