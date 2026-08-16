import { CheckCircle2, History, MinusCircle, XCircle } from "lucide-react";
import type { HistoryStats } from "../../api/history";

interface Props {
  stats: HistoryStats;
}

export function StatTiles({ stats }: Props) {
  const tiles: { label: string; value: number; icon: typeof History; className: string }[] = [
    { label: "Total", value: stats.total, icon: History, className: "text-slate-200" },
    { label: "Passed", value: stats.passed, icon: CheckCircle2, className: "text-emerald-400" },
    { label: "Failed", value: stats.failed, icon: XCircle, className: "text-red-400" },
    { label: "Cancelled", value: stats.cancelled, icon: MinusCircle, className: "text-slate-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tile.icon className={`h-4 w-4 ${tile.className}`} aria-hidden="true" />
            {tile.label}
          </div>
          <div className={`mt-1 text-2xl font-bold ${tile.className}`}>{tile.value}</div>
        </div>
      ))}
    </div>
  );
}
