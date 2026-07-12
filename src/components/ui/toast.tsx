"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Global Helper to trigger toasts
export const showToast = (message: string, type: ToastType = "info", duration = 4000) => {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("app-toast", {
      detail: { message, type, duration }
    });
    window.dispatchEvent(event);
  }
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType; duration?: number }>;
      const { message, type, duration } = customEvent.detail;
      const newToast: ToastItem = {
        id: Math.random().toString(36).substring(2, 9),
        message,
        type,
        duration: duration || 4000,
      };

      setToasts((prev) => [...prev, newToast]);
    };

    window.addEventListener("app-toast", handleToastEvent);
    return () => {
      window.removeEventListener("app-toast", handleToastEvent);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-5 left-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
  };

  const borderColors = {
    success: "border-emerald-100 bg-emerald-50/90 text-emerald-900 dark:bg-emerald-950/90 dark:border-emerald-900/50 dark:text-emerald-50",
    error: "border-rose-100 bg-rose-50/90 text-rose-900 dark:bg-rose-950/90 dark:border-rose-900/50 dark:text-rose-50",
    info: "border-blue-100 bg-blue-50/90 text-blue-900 dark:bg-blue-950/90 dark:border-blue-900/50 dark:text-blue-50",
    warning: "border-amber-100 bg-amber-50/90 text-amber-900 dark:bg-amber-950/90 dark:border-amber-900/50 dark:text-amber-50",
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-slide-in-left ${
        borderColors[toast.type]
      }`}
    >
      {icons[toast.type]}
      <div className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</div>
      <button
        onClick={onClose}
        className="p-0.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-400 hover:text-slate-650 shrink-0 transition"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
