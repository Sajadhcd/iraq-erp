"use client";

import React from "react";
import { Package, Search, Plus } from "lucide-react";

type EmptyVariant = "no-data" | "no-results" | "no-permission" | "error";

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

const defaults: Record<EmptyVariant, { title: string; message: string; icon: React.ReactNode }> = {
  "no-data": {
    title: "لا توجد سجلات",
    message: "لم يتم إضافة أي بيانات بعد. ابدأ بإضافة أول سجل.",
    icon: <Package className="h-10 w-10 text-slate-300" />,
  },
  "no-results": {
    title: "لا نتائج",
    message: "لم يتم العثور على نتائج مطابقة لبحثك. جرب كلمات مفتاحية مختلفة.",
    icon: <Search className="h-10 w-10 text-slate-300" />,
  },
  "no-permission": {
    title: "غير مصرح",
    message: "ليس لديك الصلاحية للوصول إلى هذه البيانات.",
    icon: (
      <svg
        className="h-10 w-10 text-slate-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  },
  error: {
    title: "حدث خطأ",
    message: "تعذر تحميل البيانات. يرجى المحاولة مرة أخرى.",
    icon: (
      <svg
        className="h-10 w-10 text-rose-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
};

/**
 * Enterprise Empty State
 * Displays a friendly empty state with icon, title, message, and optional action button.
 */
export default function EmptyState({
  variant = "no-data",
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  const def = defaults[variant];

  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4"
      role="status"
      aria-live="polite"
    >
      <div className="h-20 w-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center transition-transform duration-300 hover:scale-105">
        {icon ?? def.icon}
      </div>
      <div className="space-y-1.5 max-w-xs">
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
          {title ?? def.title}
        </h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed">
          {message ?? def.message}
        </p>
      </div>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition mt-2"
          aria-label={actionLabel}
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
