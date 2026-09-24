import { Outlet } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/useAuth";
import { roleLabels } from "../types/auth";
import { StaffNav } from "./StaffNav";
import { StudentNav } from "./StudentNav";

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-teal-800 text-sm font-bold text-white" aria-hidden="true">
              E
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">EduSupport</p>
              <p className="text-xs text-slate-500">Student support desk</p>
            </div>
            </div>
            {user?.role === "student" ? <StudentNav /> : null}
            {user?.role === "staff" ? <StaffNav /> : null}
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">{user.name}</p>
                <Badge>{roleLabels[user.role]}</Badge>
              </div>
              <Button type="button" onClick={logout} className="bg-slate-800 hover:bg-slate-900">
                Log out
              </Button>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
