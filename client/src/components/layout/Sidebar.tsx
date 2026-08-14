import { NavLink } from "react-router";
import { FlaskConical, LayoutDashboard, History } from "lucide-react";
import { ConnectionStatus } from "../ConnectionStatus";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/history", label: "Run History", icon: History, end: false },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <div className="flex items-center gap-2 px-4 py-5">
        <FlaskConical className="h-6 w-6 text-blue-500" aria-hidden="true" />
        <span className="text-lg font-bold text-white">
          Claritas<span className="ml-1 font-semibold text-blue-400">E2E</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
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
