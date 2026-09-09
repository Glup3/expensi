import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastContext, type ToastAction, type ToastApi } from "./toast-context.ts";

interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, action, durationMs = 4000) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, action }]);
      setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-host">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" role="status">
            <span className="toast-message">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toast.action?.run();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
