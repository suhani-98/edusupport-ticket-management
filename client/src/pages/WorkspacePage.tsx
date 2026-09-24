import { Card } from "../components/ui/Card";
import { useAuth } from "../context/useAuth";
import { roleLabels } from "../types/auth";

const titles = {
  student: "Student workspace",
  staff: "Staff workspace",
  manager: "Manager workspace",
} as const;

export function WorkspacePage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <Card>
      <h1 className="text-2xl font-semibold text-slate-900">{titles[user.role]}</h1>
      <p className="mt-2 text-slate-700">
        Signed in as {user.name}, {roleLabels[user.role].toLowerCase()}.
      </p>
      <div className="mt-6 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Coming next: ticket lists, ticket creation, and role dashboards. Those screens are not part of this step.
      </div>
    </Card>
  );
}
