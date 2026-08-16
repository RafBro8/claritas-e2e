import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, HelpCircle, Sparkles } from "lucide-react";
import type { FailureAnalysis, FailureCategory } from "../types";

interface Props {
  analysis: FailureAnalysis;
}

const CATEGORY_STYLES: Record<FailureCategory, { label: string; className: string; icon: typeof AlertTriangle }> = {
  environment: {
    label: "Likely environment issue",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-400",
    icon: AlertTriangle,
  },
  "ui-change": {
    label: "Likely UI change",
    className: "border-violet-500/30 bg-violet-500/15 text-violet-400",
    icon: Sparkles,
  },
  unknown: {
    label: "Cause unclear",
    className: "border-slate-500/30 bg-slate-500/15 text-slate-400",
    icon: HelpCircle,
  },
};

const TOOLTIP_WIDTH = 288;

/**
 * A colour-coded pill for a run's failure classification, with a click-to-
 * open tooltip listing the plain-English signals behind the category and
 * its confidence. The tooltip renders through a portal into document.body
 * at a fixed position computed from the button's own rect, rather than
 * being absolutely positioned inside the badge — this component gets used
 * inside the Run History table, which scrolls horizontally via
 * overflow-x-auto, and a non-portaled tooltip gets silently clipped by
 * that ancestor for any row near the bottom of the table (overflow-x:auto
 * forces overflow-y to auto too, so vertical overflow is clipped as well,
 * not just horizontal).
 */
export function FailureBadge({ analysis }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { label, className, icon: Icon } = CATEGORY_STYLES[analysis.category];

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    function updatePosition(): void {
      const rect = buttonRef.current!.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8);
      setPosition({ top: rect.bottom + 8, left: Math.max(8, left) });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent): void {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${className}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            role="tooltip"
            style={{ position: "fixed", top: position.top, left: position.left, width: TOOLTIP_WIDTH }}
            className="z-50 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-xl"
          >
            <div className="mb-1.5 font-semibold text-slate-200">Confidence: {Math.round(analysis.confidence * 100)}%</div>
            {analysis.signals.length > 0 ? (
              <ul className="flex flex-col gap-1 text-slate-400">
                {analysis.signals.map((signal, index) => (
                  <li key={index} className="flex gap-1.5">
                    <span className="text-slate-600">•</span>
                    {signal}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No signals recorded.</p>
            )}
            <p className="mt-2 border-t border-slate-800 pt-2 text-slate-500">
              Always a suggestion — confirm against the report.
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
