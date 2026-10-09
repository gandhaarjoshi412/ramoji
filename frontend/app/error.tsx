"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("PlateSight Unhandled Client Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="font-serif text-2xl font-bold text-slate-900">
          Something went wrong
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error?.message || "An unexpected rendering error occurred while loading this page. Click below to retry or return to the main dashboard."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reload Component
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-2xs flex items-center gap-2 active:scale-95"
        >
          <Home className="w-3.5 h-3.5" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
