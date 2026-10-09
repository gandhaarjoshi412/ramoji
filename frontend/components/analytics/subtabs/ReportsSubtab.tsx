"use client";

import React, { useEffect, useState } from "react";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import { EodReportResponse, NormalizedFoodRecord } from "@/types/analytics";
import {
  FileSpreadsheet,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  CalendarDays,
  UserCheck,
  ChefHat,
  Sparkles,
} from "lucide-react";

interface ReportsSubtabProps {
  selectedHotel: string;
  rawRecords: NormalizedFoodRecord[];
  onExportCsv: () => void;
  onExportExcel: () => void;
}

export const ReportsSubtab: React.FC<ReportsSubtabProps> = ({
  selectedHotel,
  rawRecords,
  onExportCsv,
  onExportExcel,
}) => {
  const [reportDate, setReportDate] = useState<string>("");
  const [reportData, setReportData] = useState<EodReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Available dates from records
  const availableDates = Array.from(new Set(rawRecords.map((r) => r.date))).sort().reverse();

  useEffect(() => {
    if (!reportDate && availableDates.length > 0) {
      setReportDate(availableDates[0]);
    }
  }, [availableDates, reportDate]);

  useEffect(() => {
    let isMounted = true;
    async function loadEod() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (selectedHotel && selectedHotel !== "all") query.set("hotel", selectedHotel);
        if (reportDate) query.set("report_date", reportDate);

        const res = await apiRequest<EodReportResponse>(
          `/api/analytics/eod-report?${query.toString()}`
        );
        if (isMounted) setReportData(res);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadEod();
    return () => {
      isMounted = false;
    };
  }, [selectedHotel, reportDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 mb-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Executive Hospitality Ledger & Audits
          </div>
          <h2 className="font-serif text-xl font-bold text-slate-900">
            End-of-Day Operations Report & Culinary Audits
          </h2>
          <p className="text-xs text-slate-500">
            Verified shift closure reports with chef sign-off lines, mass-balance certifications, and downloadable ledgers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {availableDates.length > 0 && (
            <select
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="text-xs py-2 px-3 border border-slate-200 rounded-xl bg-white text-slate-800 font-semibold focus:outline-hidden"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  Report Date: {d}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>

          <button
            onClick={onExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel
          </button>
        </div>
      </div>

      {/* Official End-of-Day Report Printable Canvas */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 animate-pulse">
          Generating End-of-Day Hospitality Report...
        </div>
      ) : !reportData || !reportData.has_data ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          No recorded service operations found for {reportDate || "the selected date"}.
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-8 sm:p-10 shadow-md space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Official Document Header */}
          <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold tracking-widest uppercase text-emerald-700">
                PLATESIGHT / DOLPHIN HOTELS OPERATIONS AUDIT
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Daily Food Production & Waste Closure Report
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Property: <strong>{reportData.hotel_name}</strong> • Audit Date:{" "}
                <strong className="font-mono">{reportData.report_date}</strong>
              </p>
            </div>

            <div className="text-right text-xs text-slate-500 sm:self-center">
              <div>Generated: {reportData.generated_at}</div>
              <div className="inline-flex items-center gap-1 font-bold text-emerald-800 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Ledger Status: Verified
              </div>
            </div>
          </div>

          {/* Headline Numbers Grid */}
          {reportData.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Total Guests Served
                </span>
                <span className="text-2xl font-serif font-bold text-slate-900 mt-0.5 block">
                  {reportData.total_guests}
                </span>
                <span className="text-[10px] text-slate-500">
                  across {reportData.total_sessions} dining sessions
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Food Cooked / Eaten
                </span>
                <div className="text-lg font-serif font-bold text-slate-900 mt-0.5">
                  {formatKg(reportData.summary.total_prepared_kg)}
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {formatKg(reportData.summary.total_consumed_kg)} consumed (
                  {((reportData.summary.total_consumed_kg / reportData.summary.total_prepared_kg) * 100).toFixed(1)}%)
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Final Food Discarded
                </span>
                <div className="text-lg font-serif font-bold text-rose-800 mt-0.5">
                  {formatKg(reportData.summary.total_waste_kg)} ({reportData.summary.waste_rate_pct.toFixed(1)}%)
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {reportData.summary.waste_per_guest_g.toFixed(0)}g per attendee
                </span>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Direct Cost Loss
                </span>
                <div className="text-2xl font-serif font-bold text-emerald-400 mt-0.5">
                  {formatINR(reportData.summary.total_waste_cost_inr)}
                </div>
                <span className="text-[10px] text-slate-400">
                  ₹{reportData.summary.waste_cost_per_guest.toFixed(1)} loss / guest
                </span>
              </div>
            </div>
          )}

          {/* Session Breakdown Table */}
          {reportData.sessions && reportData.sessions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">
                Shift & Meal Session Operations
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Session</th>
                      <th className="py-2.5 px-3">Dishes</th>
                      <th className="py-2.5 px-3 text-right">Guests</th>
                      <th className="py-2.5 px-3 text-right">Cooked (kg)</th>
                      <th className="py-2.5 px-3 text-right">Eaten (kg)</th>
                      <th className="py-2.5 px-3 text-right">Reused (kg)</th>
                      <th className="py-2.5 px-3 text-right">Waste (kg)</th>
                      <th className="py-2.5 px-3 text-right">Waste %</th>
                      <th className="py-2.5 px-3 text-right">Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.sessions.map((s, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-bold text-slate-800">{s.session}</td>
                        <td className="py-2 px-3 text-slate-500">{s.dish_count}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">{s.pax}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">{formatKg(s.prepared_kg)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatKg(s.consumed_kg)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatKg(s.reuse_kg)}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-700 font-bold">{formatKg(s.waste_kg)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">{s.waste_rate_pct.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(s.waste_cost_inr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Wasted Dishes */}
          {reportData.top_wasted_dishes && reportData.top_wasted_dishes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">
                Highest Waste Discard Dish Items
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {reportData.top_wasted_dishes.map((td, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{td.dish_name}</div>
                      <div className="text-[11px] text-slate-500">{td.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-700 font-mono">{formatKg(td.waste_kg)} ({td.waste_pct}%)</div>
                      <div className="text-[11px] text-slate-600 font-mono">{formatINR(td.waste_cost)} loss</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mass-Balance Certification */}
          {reportData.mass_balance && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Culinary Mass-Balance Law Certification</span>
              </div>
              <p className="text-emerald-800 leading-relaxed">
                Status: <strong>{reportData.mass_balance.variance_status}</strong>. Production Variance: {reportData.mass_balance.production_variance_kg.toFixed(2)} kg. Leftover Reconciliation Variance: {reportData.mass_balance.leftover_variance_kg.toFixed(2)} kg.
              </p>
            </div>
          )}

          {/* Formal Sign-Off Blocks */}
          <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
            <div className="space-y-4">
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                Culinary Kitchen Sign-off
              </div>
              <div className="space-y-1">
                <div className="font-bold text-slate-900">Executive Chef / Sous Chef</div>
                <div className="text-slate-500">Dolphin Hotels Culinary Operations</div>
              </div>
              <div className="pt-6 border-b border-slate-300 w-3/4">
                <span className="font-serif italic text-slate-400 text-sm">Verified & Approved</span>
              </div>
              <div className="text-[10px] text-slate-400">Date: {reportData.report_date}</div>
            </div>

            <div className="space-y-4 sm:pl-8 sm:border-l border-slate-200">
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                Management Sign-off
              </div>
              <div className="space-y-1">
                <div className="font-bold text-slate-900">Food & Beverage Director</div>
                <div className="text-slate-500">Hospitality General Management</div>
              </div>
              <div className="pt-6 border-b border-slate-300 w-3/4">
                <span className="font-serif italic text-slate-400 text-sm">Reviewed & Audited</span>
              </div>
              <div className="text-[10px] text-slate-400">Date: {reportData.report_date}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
