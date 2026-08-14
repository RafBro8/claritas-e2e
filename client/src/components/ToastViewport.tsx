import { useToast } from "../context/ToastContext";

const VARIANT_STYLES = {
  success: "border-emerald-800 bg-emerald-950 text-emerald-200",
  error: "border-red-800 bg-red-950 text-red-200",
  info: "border-slate-700 bg-slate-800 text-slate-200",
};

export function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${VARIANT_STYLES[toast.variant]}`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss"
            className="text-current opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
