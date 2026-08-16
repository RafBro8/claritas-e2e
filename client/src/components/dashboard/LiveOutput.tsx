import { useEffect, useRef } from "react";
import { TerminalSquare } from "lucide-react";
import type { OutputLine } from "../../hooks/useRunStream";

interface Props {
  lines: OutputLine[];
}

export function LiveOutput({ lines }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <TerminalSquare className="h-4 w-4" aria-hidden="true" />
        Live output
      </div>
      <div ref={scrollRef} className="h-72 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed">
        {lines.length === 0 ? (
          <p className="text-slate-600">Select specs above and click "Run Selected" to see live output here.</p>
        ) : (
          lines.map((entry, index) => (
            <div key={index} className={entry.type === "stderr" ? "text-red-400" : "text-slate-300"}>
              {entry.line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
