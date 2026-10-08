"use client";

import React, { useState } from "react";
import { DataQualityReport } from "@/types/analytics";
import {
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
  ChevronDown,
  Layers,
  History,
} from "lucide-react";

interface AuditAndDataQualitySectionProps {
  report: DataQualityReport;
}

export const AuditAndDataQualitySection: React.FC<AuditAndDataQualitySectionProps> = ({
  report,
}) => {
  const [showWarnings, setShowWarnings] = useState(false);

  const isHighQuality = report.overall_score_pct >= 95;

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Data Quality & Audit Traceability
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Validation layer ensuring mathematical integrity, portion balance, and operational audit trail
          </p>
        </div>

        {/* Quality Score Indicator */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Validation Score
            </span>
            <span className="text-lg font-black text-slate-900">
              {report.overall_score_pct.toFixed(1)}%
            </span>
          </div>

          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
              isHighQuality
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3 Overview Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        {/* Total Records Validated */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
            Validated Records
          </span>
          <div className="text-base font-black text-slate-900">
            {report.valid_records} / {report.total_records}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
            Passed unit and range validation
          </span>
        </div>

        {/* Source Breakdown */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
            Data Source Ingestion
          </span>
          <div className="space-y-1 mt-1">
            {report.source_breakdown.map((s) => (
              <div key={s.source} className="flex justify-between text-[11px] font-medium text-slate-700">
                <span>{s.source}</span>
                <span className="font-bold">{s.count} ({s.percentage.toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Origin */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
            Audit Lineage
          </span>
          <div className="text-slate-800 font-bold text-[11px]">
            {report.audit_info.hotel}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            File: {report.audit_info.file_name || "Daily Production Report.xlsx"}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Updated: {report.audit_info.last_uploaded_at || "Recent Sync"}
          </div>
        </div>
      </div>

      {/* Warnings Accordion if warnings exist */}
      {report.warnings.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>
                {report.warnings.length} Incomplete or Flagged Records Detected (e.g. Missing guest pax or zero cost)
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-amber-700 transition-transform ${
                showWarnings ? "rotate-180" : ""
              }`}
            />
          </button>

          {showWarnings && (
            <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2 animate-in fade-in">
              {report.warnings.map((w, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                >
                  <div className="font-medium text-slate-700">
                    <strong className="text-slate-900">{w.item || `Record #${w.record_id}`}:</strong>{" "}
                    {w.issue}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      w.severity === "high"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {w.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
