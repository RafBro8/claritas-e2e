import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { IdentityMenu } from "./IdentityMenu";
import { ThemeToggle } from "../ThemeToggle";
import { ToastViewport } from "../ToastViewport";

export function AppLayout() {
  return (
    // Stacks below md. Side by side, the 224px sidebar plus the content column
    // needed 576px, so a 375px phone scrolled sideways by 201px and clipped
    // every panel. min-w-0 matters as much as the direction: without it a flex
    // child refuses to shrink below its content and the overflow comes back.
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 md:flex-row">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-slate-800 px-6 py-3">
          <IdentityMenu />
          <ThemeToggle />
        </header>

        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>

        <footer className="border-t border-slate-800 px-6 py-4 text-xs text-slate-500">
          Designed &amp; Built by{" "}
          <a
            href="https://goodlookingdigital.com"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-400 underline-offset-2 transition-colors hover:text-slate-200 hover:underline"
          >
            Good Looking Digital
          </a>
        </footer>
      </div>

      <ToastViewport />
    </div>
  );
}
