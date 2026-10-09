"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { DataQualityCenterResponse, DataQualityReport, MassBalanceAuditData } from "@/types/analytics";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSearch,
  Building2,
  Users,
  Coins,
  Scale,
  RefreshCw,
} from "lucide-react";

interface DataQualitySubtabProps {
  selectedHotel: string;
  report?: DataQualityReport;
  massBalanceAudit?: MassBalanceAuditData;
}

export const DataQualitySubtab: React.FC<DataQualitySubtabProps> = ({
  selectedHotel,
  report,
  massBalanceAudit,
}) => {
  const [auditData, setAuditData] = useState<DataQualityCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  useEffect(() => {
    let isMounted = true;
    async function loadDataQualityAudit() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        if (selectedHotel && selectedHotel !== "all") query.set("hotel", selectedHotel);

        const res = await apiRequest<DataQualityCenterResponse>(
          `/api/analytics/data-quality?${query.toString()}`
        );
        if (isMounted) setAuditData(res);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load data quality audit");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDataQualityAudit();
    return () => {
      isMounted = false;
    };
  }, [selectedHotel]);

  const score = auditData?.overall_score_pct ?? report?.overall_score_pct ?? 100;
  const rating = auditData?.rating ?? "Good";
  const issues = auditData?.issues_feed || [];

  const filteredIssues = issues.filter((iss) => {
    if (filterSeverity === "all") return true;
    return iss.severity.toLowerCase() === filterSeverity.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 mb-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            Integrity Center & Provenance Ledger
          </div>
          <h2 className="font-serif text-xl font-bold text-slate-900">
            Culinary Data Quality & Audit Health
          </h2>
          <p className="text-xs text-slate-500">
            Mathematical integrity audit: tracks missing hotels, unverified measurements, missing recipe costs, and mass-balance discrepancies.
          </p>
        </div>

        {/* Score & Formula Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Overall Quality Score
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-serif font-extrabold text-slate-900">
                  {score.toFixed(1)}%
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    score >= 90
                      ? "bg-emerald-100 text-emerald-800"
                      : score >= 75
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {rating}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 col-span-2 text-xs space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Transparent Formula Weights
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <div className="text-slate-500 text-[10px]">Hotel Link (20%)</div>
                <div className="font-bold text-slate-800">
                  {auditData ? `${auditData.audit_summary.missing_hotel_count} missing` : "100% complete"}
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <div className="text-slate-500 text-[10px]">Mass Balance (20%)</div>
                <div className="font-bold text-slate-800">
                  {auditData ? `${auditData.audit_summary.unreconciled_mass_balance_count} variance` : "Reconciled"}
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <div className="text-slate-500 text-[10px]">Attendance Pax (15%)</div>
                <div className="font-bold text-slate-800">
                  {auditData ? `${auditData.audit_summary.missing_pax_count} missing` : "Complete"}
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <div className="text-slate-500 text-[10px]">Shift Session (15%)</div>
                <div className="font-bold text-slate-800">
                  {auditData ? `${auditData.audit_summary.missing_session_count} missing` : "Complete"}
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <div className="text-slate-500 text-[10px]">Recipe Cost (15%)</div>
                <div className="font-bold text-slate-800">
                  {auditData ? `${auditData.audit_summary.missing_cost_count} missing` : "Configured"}
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <div className="text-slate-500 text-[10px]">Verification (15%)</div>
                <div className="font-bold text-slate-800">
                  {auditData ? `${auditData.audit_summary.unverified_count} unverified` : "Verified"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mass-Balance Discrepancy Investigation Alert (Example 1) */}
      {massBalanceAudit && !massBalanceAudit.is_reconciled && (
        <div className="p-5 bg-amber-50/80 border-2 border-amber-300 rounded-2xl space-y-3">
          <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Operational Mass-Balance Variance Detected ({Math.abs(massBalanceAudit.leftover_variance_kg).toFixed(2)} kg)</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            {massBalanceAudit.audit_note}
          </p>

          {massBalanceAudit.unaccounted_discrepancy_records.length > 0 && (
            <div className="overflow-x-auto pt-1">
              <table className="w-full text-left text-xs bg-white rounded-xl border border-amber-200 overflow-hidden">
                <thead>
                  <tr className="bg-amber-100/60 text-amber-900 font-bold border-b border-amber-200">
                    <th className="py-2 px-3">Item Name</th>
                    <th className="py-2 px-3">Property & Session</th>
                    <th className="py-2 px-3 text-right">Leftover</th>
                    <th className="py-2 px-3 text-right">Reused</th>
                    <th className="py-2 px-3 text-right">Waste</th>
                    <th className="py-2 px-3 text-right">Variance</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {massBalanceAudit.unaccounted_discrepancy_records.map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-bold text-slate-900">{r.dish_name}</td>
                      <td className="py-2 px-3 text-slate-600">{r.hotel_name} • {r.session} ({r.date})</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-900">{r.leftover_kg} kg</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700">{r.reuse_kg} kg</td>
                      <td className="py-2 px-3 text-right font-mono text-rose-700">{r.waste_kg} kg</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{r.unaccounted_variance_kg} kg</td>
                      <td className="py-2 px-3 font-semibold text-amber-900">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Itemized Issues Feed */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-slate-900">
              Audit Issues Feed ({filteredIssues.length} found)
            </h3>
            <p className="text-xs text-slate-500">
              Direct recommendations to resolve data anomalies in banquet entries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="text-xs py-1.5 px-3 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Auditing records...
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No data quality issues found in the selected scope!
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((iss) => {
              const sevBadge =
                iss.severity === "Critical"
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : iss.severity === "High"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-blue-100 text-blue-800 border-blue-200";

              return (
                <div
                  key={iss.id}
                  className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sevBadge}`}
                      >
                        {iss.severity}
                      </span>
                      <strong className="text-slate-900">{iss.issue_type}</strong>
                      <span className="text-slate-500">• {iss.dish_name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {iss.hotel_name} • {iss.session} • {iss.date}
                    </span>
                  </div>

                  <p className="text-slate-700">{iss.description}</p>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 text-slate-600 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-800">Suggested Action: </strong>
                      {iss.suggested_action}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
