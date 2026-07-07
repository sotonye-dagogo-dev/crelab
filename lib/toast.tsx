"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, type?: Toast["type"], action?: ToastAction) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
  dismissToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: Toast["type"] = "success", action?: ToastAction) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismissToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[2000] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-[8px] text-[13px] font-medium shadow-lg
              animate-[slideUp_0.2s_ease-out]
              ${t.type === "success" ? "bg-[var(--color-success)] text-[var(--color-text-inverse)]" : ""}
              ${t.type === "error" ? "bg-[var(--color-error)] text-white" : ""}
              ${t.type === "info" ? "bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border border-[var(--color-border)]" : ""}
            `.trim()}
          >
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.onClick();
                  dismissToast(t.id);
                }}
                className="bg-transparent border border-current rounded-[6px] px-2.5 py-1 text-[11px] font-semibold cursor-pointer hover:opacity-80 whitespace-nowrap"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
