"use client";

import React, { useEffect, useState } from "react";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import { HotelAnalyticsResponse, HotelAnalyticsSummary } from "@/types/analytics";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Users,
  ShieldCheck,
  Sparkles,
  Info,
} from "lucide-react";

interface HotelsSubtabProps {
  selectedHotel: string;
  onSelectHotel: (hotelName: string) => void;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
}

export const HotelsSubtab: React.FC<HotelsSubtabProps> = ({
  selectedHotel,
  onSelectHotel,
  datePreset = "all",
  startDate,
  endDate,
}) => {
  const [data, setData] = useState<HotelAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadHotelAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        if (datePreset) query.set("date_preset", datePreset);
        if (startDate) query.set("start_date", startDate);
        if (endDate) query.set("end_date", endDate);

        const res = await apiRequest<HotelAnalyticsResponse>(
          `/api/analytics/hotels?${query.toString()}`
        );
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load hotel analytics");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadHotelAnalytics();
    return () => {
      isMounted = false;
    };
  }, [datePreset, startDate, endDate]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-slate-100 rounded-2xl border border-slate-200" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
        {error || "Unable to load hotel property comparison."}
      </div>
    );
  }

  const hotels = data.hotels || [];
  const benchmark = data.portfolio_benchmark;

  return (
    <div className="space-y-6">
      {/* Hotel Selection Header Banner */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              Property Intelligence & Multi-Hotel Portfolio
            </div>
            <h2 className="font-serif text-xl font-bold text-slate-900">
              Hotel-Wise Performance & Normalized Benchmarking
            </h2>
            <p className="text-xs text-slate-500">
              Compare properties using fair per-guest normalized metrics to prevent large banquets from unfairly appearing worse than smaller operations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectHotel("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedHotel === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Hotels (Consolidated)
            </button>
          </div>
        </div>

        {/* Quick Hotel Switcher Pills */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          {hotels.map((h) => {
            const isSelected = selectedHotel === h.hotel_name;
            return (
              <button
                key={h.hotel_name}
                onClick={() => onSelectHotel(h.hotel_name)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{h.hotel_name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {h.waste_rate_pct.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {hotels.map((h) => {
          const isSelected = selectedHotel === h.hotel_name;
          const hasRecords = h.total_records > 0;
          const displayStatus = hasRecords ? h.performance_status : "No Activity";
          const statusColors = !hasRecords
            ? "bg-slate-100 text-slate-600 border-slate-200"
            : h.performance_status === "Excellent"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : h.performance_status === "Good"
            ? "bg-blue-50 text-blue-800 border-blue-200"
            : h.performance_status === "Moderate"
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : "bg-rose-50 text-rose-800 border-rose-200";

          return (
            <div
              key={h.hotel_name}
              className={`hotel-card p-5 bg-white rounded-2xl border transition-all ${
                isSelected
                  ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                  : "border-slate-200/90 hover:border-slate-300 shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-base font-bold text-slate-900">
                    {h.hotel_name}
                  </h3>
                  <p className="text-[11px] text-slate-500">{h.location}</p>
                </div>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${statusColors}`}
                >
                  {displayStatus}
                </span>
              </div>

              {/* Core Normalized Metrics */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Waste Rate
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-slate-900 font-serif">
                      {h.waste_rate_pct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-500">of prepared</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Waste / Guest
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-slate-900 font-serif">
                      {h.waste_per_guest_g.toFixed(0)}g
                    </span>
                    <span className="text-[10px] text-slate-500">per pax</span>
                  </div>
                </div>
              </div>

              {/* Detailed Numbers */}
              <div className="space-y-2 mt-4 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Prepared Food:</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {formatKg(h.total_prepared_kg)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Food Eaten:</span>
                  <span className="font-semibold text-emerald-700 font-mono">
                    {formatKg(h.total_consumed_kg)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Safely Reused:</span>
                  <span className="font-semibold text-emerald-700 font-mono">
                    {formatKg(h.total_reuse_kg)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Discarded Waste:</span>
                  <span className="font-semibold text-rose-700 font-mono">
                    {formatKg(h.total_waste_kg)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
                  <span className="font-semibold">Financial Loss:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatINR(h.total_waste_cost)}
                  </span>
                </div>
              </div>

              {/* Audit Health and Filter Action */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  {!hasRecords ? (
                    <span className="text-slate-400">No Records</span>
                  ) : h.mass_balance_reconciled ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Variance {Math.abs(h.leftover_variance_kg).toFixed(1)}kg
                    </span>
                  )}
                  <span>• DQ: {hasRecords ? `${h.data_quality_score_pct.toFixed(0)}%` : "N/A (No records)"}</span>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectHotel(h.hotel_name)}
                  className={`text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    isSelected ? "text-emerald-600 font-extrabold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isSelected ? "Active Hotel" : "Filter Here"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Normalized Portfolio Comparison Table */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-900">
              Fair Normalized Comparison Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Normalized per guest and per prepared kg metrics enable direct apples-to-apples performance audits.
            </p>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Portfolio Benchmark: <strong className="text-slate-900">{benchmark?.portfolio_waste_rate_pct.toFixed(1)}%</strong> waste rate • <strong className="text-slate-900">{benchmark?.portfolio_waste_per_guest_g.toFixed(0)}g</strong> / guest
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70 font-semibold">
                <th className="py-3 px-4">Hotel Property</th>
                <th className="py-3 px-4">Shifts / Dates</th>
                <th className="py-3 px-4 text-right">Guests (Pax)</th>
                <th className="py-3 px-4 text-right">Food Prepared</th>
                <th className="py-3 px-4 text-right">Waste Rate %</th>
                <th className="py-3 px-4 text-right">Waste / Guest</th>
                <th className="py-3 px-4 text-right">Waste Cost</th>
                <th className="py-3 px-4 text-right">Cost / Guest</th>
                <th className="py-3 px-4 text-center">Data Health</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hotels.map((h) => {
                const isSelected = selectedHotel === h.hotel_name;
                return (
                  <tr
                    key={h.hotel_name}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isSelected ? "bg-emerald-50/40 font-semibold" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{h.hotel_name}</div>
                      <div className="text-[11px] text-slate-500">{h.location}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {h.dates_recorded_count} dates ({h.total_sessions} shifts)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900">
                      {h.total_pax.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900">
                      {formatKg(h.total_prepared_kg)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          h.waste_rate_pct <= (benchmark?.portfolio_waste_rate_pct || 5)
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }
                      >
                        {h.waste_rate_pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {h.waste_per_guest_g.toFixed(0)}g
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900">
                      {formatINR(h.total_waste_cost)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      ₹{h.waste_cost_per_guest.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.data_quality_score_pct >= 90
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {h.data_quality_score_pct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectHotel(h.hotel_name)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-all"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
