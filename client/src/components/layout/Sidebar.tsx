import { NavLink } from "react-router";
import { FlaskConical, LayoutDashboard, History, CalendarClock } from "lucide-react";
import { ConnectionStatus } from "../ConnectionStatus";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/history", label: "Run History", icon: History, end: false },
  { to: "/schedules", label: "Scheduled Runs", icon: CalendarClock, end: false },
];

export function Sidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-800 bg-slate-900 md:w-56 md:border-r md:border-b-0">
      <div className="flex items-center gap-2 px-4 py-5">
        <FlaskConical className="h-6 w-6 text-blue-500" aria-hidden="true" />
        <span className="text-lg font-bold text-white">
          Claritas<span className="ml-1 font-semibold text-blue-400">E2E</span>
        </span>
      </div>

      {/* A row on a phone, a column from md. Three links fit across 375px, so
          a scrollable row beats a menu you have to open to reveal them. */}
      <nav className="flex flex-row gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:pb-0">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${
                isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800">
        <ConnectionStatus />
      </div>
    </aside>
  );
}
