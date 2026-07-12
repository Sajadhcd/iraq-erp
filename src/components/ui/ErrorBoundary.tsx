"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Enterprise Error Boundary
 * Catches rendering errors and shows a professional error page instead of a
 * blank white screen.  Only class components can be error boundaries in React.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught rendering error:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="h-16 w-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 animate-bounce-slow">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">
              حدث خطأ غير متوقع
            </h2>
            <p className="text-slate-500 text-sm max-w-sm">
              {this.state.error?.message ||
                "عذراً، حدث خطأ أثناء عرض هذه الصفحة. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني."}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition"
            aria-label="إعادة المحاولة"
          >
            <RefreshCw className="h-4 w-4" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
