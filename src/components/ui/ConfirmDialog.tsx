"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Enterprise Confirmation Dialog
 * Accessible modal dialog with keyboard support (Escape to close, Enter to confirm).
 * Supports danger / warning / info variants.
 */
export default function ConfirmDialog({
  isOpen,
  title = "تأكيد العملية",
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  variant = "danger",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus the confirm button when dialog opens
    const timeout = setTimeout(() => {
      confirmRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: "bg-rose-100 text-rose-600",
      confirm: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20",
    },
    warning: {
      icon: "bg-amber-100 text-amber-600",
      confirm: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20",
    },
    info: {
      icon: "bg-blue-100 text-blue-600",
      confirm: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${styles.icon}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3
              id="confirm-dialog-title"
              className="text-base font-bold text-slate-800 dark:text-slate-100"
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p
            id="confirm-dialog-message"
            className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed"
          >
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${styles.confirm}`}
            aria-label={confirmLabel}
          >
            {isLoading && (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition disabled:opacity-60"
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
