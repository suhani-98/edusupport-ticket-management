import { NavLink, useLocation } from "react-router-dom";
import { navLinkClass } from "../lib/ui";

export function StudentNav() {
  const { pathname } = useLocation();
  const onTicketList = pathname === "/student/tickets" || /^\/student\/tickets\/(?!new$).+/.test(pathname);

  return (
    <nav aria-label="Student" className="flex flex-wrap gap-1">
      <NavLink to="/student" end className={({ isActive }) => navLinkClass(isActive)}>
        Dashboard
      </NavLink>
      <NavLink to="/student/tickets" className={() => navLinkClass(onTicketList)} aria-current={onTicketList ? "page" : undefined}>
        My Tickets
      </NavLink>
      <NavLink to="/student/tickets/new" className={({ isActive }) => navLinkClass(isActive)}>
        Create Ticket
      </NavLink>
    </nav>
  );
}
