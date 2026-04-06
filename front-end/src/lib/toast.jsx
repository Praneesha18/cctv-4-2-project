import React, { useEffect, useRef, useState } from "react";
import { ToastContext } from "./toast-context";

function ToastItem({ id, message, tone = "info", onDismiss }) {
  const toneClasses = {
    success: "bg-[#102317]/95 text-[#E9FFED]",
    error: "border-red-300/30 bg-[rgba(66,16,16,0.94)] text-red-50",
    info: "border-white/12 bg-[rgba(12,25,16,0.94)] text-white",
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismiss(id);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto min-w-[280px] max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-[0_18px_45px_rgba(0,0,0,0.3)] backdrop-blur-xl ${toneClasses[tone] || toneClasses.info}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="leading-6">{message}</p>
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextIdRef = useRef(0);

  const dismissToast = (id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const showToast = (message, tone = "info") => {
    const id = nextIdRef.current + 1;
    nextIdRef.current = id;

    setToasts((current) => [...current, { id, message, tone }]);
    return id;
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-24 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            id={toast.id}
            message={toast.message}
            tone={toast.tone}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
