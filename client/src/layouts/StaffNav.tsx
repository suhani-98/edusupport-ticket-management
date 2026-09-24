import { NavLink } from "react-router-dom";

const linkClass = (active: boolean) =>
  `rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 ${
    active ? "bg-teal-800 text-white" : "text-slate-700 hover:bg-slate-100"
  }`;

export function StaffNav() {
  return (
    <nav aria-label="Staff" className="flex flex-wrap gap-1">
      <NavLink to="/staff" end className={({ isActive }) => linkClass(isActive)}>
        Dashboard
      </NavLink>
      <NavLink to="/staff/tickets" className={({ isActive }) => linkClass(isActive)}>
        Assigned Tickets
      </NavLink>
    </nav>
  );
}
