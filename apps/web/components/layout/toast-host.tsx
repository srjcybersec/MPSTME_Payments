"use client";

import { useToastStore } from "../../store/toast-store";

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg px-3 py-2 text-sm text-white shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-600"
              : toast.type === "error"
                ? "bg-rose-600"
                : "bg-zinc-800"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
