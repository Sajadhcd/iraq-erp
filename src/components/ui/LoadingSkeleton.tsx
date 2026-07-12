"use client";

import React from "react";

interface SkeletonProps {
  /** Number of table rows to render in table skeleton mode */
  rows?: number;
  /** Number of columns to render in table skeleton mode */
  cols?: number;
  /** Type of skeleton to render */
  variant?: "table" | "card" | "kpi" | "text" | "chart" | "form";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Enterprise Loading Skeleton
 * Renders animated placeholder UI for different content types.
 * Uses pure CSS animations so it works with Tailwind or custom CSS.
 */
export default function LoadingSkeleton({
  rows = 5,
  cols = 4,
  variant = "table",
  className = "",
}: SkeletonProps) {
  if (variant === "kpi") {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-2/3" />
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded-full w-1/3" />
              </div>
              <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl shrink-0 ms-4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-pulse ${className}`}
      >
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-1/3 mb-6" />
        <div className="h-64 bg-slate-100 dark:bg-slate-700/60 rounded-xl" />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-pulse space-y-4 ${className}`}
      >
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
        <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded-full w-full" />
        <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded-full w-5/6" />
        <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded-full w-4/6" />
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className={`space-y-3 animate-pulse ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full"
            style={{ width: `${60 + Math.random() * 40}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={`space-y-5 animate-pulse ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/4" />
            <div className="h-10 bg-slate-100 dark:bg-slate-700/60 rounded-xl w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Default: table skeleton
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-pulse ${className}`}
    >
      {/* Table header skeleton */}
      <div className="flex gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full flex-1"
          />
        ))}
      </div>
      {/* Table body rows */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div
          key={rIdx}
          className="flex gap-4 px-4 py-4 border-b border-slate-100 dark:border-slate-800 last:border-0"
        >
          <div className="h-4 w-4 bg-slate-100 dark:bg-slate-700/60 rounded" />
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded-full flex-1"
              style={{ opacity: 1 - cIdx * 0.1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
