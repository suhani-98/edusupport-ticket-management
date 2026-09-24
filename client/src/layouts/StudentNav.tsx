import { NavLink, useLocation } from "react-router-dom";

const linkClass = (active: boolean) =>
  `rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 ${
    active ? "bg-teal-800 text-white" : "text-slate-700 hover:bg-slate-100"
  }`;

export function StudentNav() {
  const { pathname } = useLocation();
  const onTicketList = pathname === "/student/tickets" || /^\/student\/tickets\/(?!new$).+/.test(pathname);

  return (
    <nav aria-label="Student" className="flex flex-wrap gap-1">
      <NavLink to="/student" end className={({ isActive }) => linkClass(isActive)}>
        Dashboard
      </NavLink>
      <NavLink to="/student/tickets" className={() => linkClass(onTicketList)} aria-current={onTicketList ? "page" : undefined}>
        My Tickets
      </NavLink>
      <NavLink to="/student/tickets/new" className={({ isActive }) => linkClass(isActive)}>
        Create Ticket
      </NavLink>
    </nav>
  );
}
