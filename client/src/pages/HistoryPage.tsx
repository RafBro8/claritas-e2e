import { History } from "lucide-react";

export function HistoryPage() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-blue-950 p-2">
          <History className="h-5 w-5 text-blue-400" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-bold">Run History</h1>
          <p className="text-sm text-slate-400">Past test runs, results, and durations.</p>
        </div>
      </div>

      <p className="mt-8 text-sm text-slate-500">Coming soon.</p>
    </div>
  );
}
