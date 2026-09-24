import { NavLink } from "react-router-dom";
import { navLinkClass } from "../lib/ui";

export function ManagerNav() {
  return (
    <nav aria-label="Manager" className="flex flex-wrap gap-1">
      <NavLink to="/manager" end className={({ isActive }) => navLinkClass(isActive)}>
        Dashboard
      </NavLink>
      <NavLink to="/manager/tickets" className={({ isActive }) => navLinkClass(isActive)}>
        All Tickets
      </NavLink>
    </nav>
  );
}
