import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { IdentityMenu } from "./IdentityMenu";
import { ThemeToggle } from "../ThemeToggle";
import { ToastViewport } from "../ToastViewport";

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-slate-800 px-6 py-3">
          <IdentityMenu />
          <ThemeToggle />
        </header>

        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>

      <ToastViewport />
    </div>
  );
}
