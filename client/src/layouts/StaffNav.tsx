import { NavLink } from "react-router-dom";
import { navLinkClass } from "../lib/ui";

export function StaffNav() {
  return (
    <nav aria-label="Staff" className="flex flex-wrap gap-1">
      <NavLink to="/staff" end className={({ isActive }) => navLinkClass(isActive)}>
        Dashboard
      </NavLink>
      <NavLink to="/staff/tickets" className={({ isActive }) => navLinkClass(isActive)}>
        Assigned Tickets
      </NavLink>
    </nav>
  );
}
