"use client";

import React, { useState } from "react";
import { HeatmapCell, DayOfWeekMetric } from "@/types/analytics";
import { formatINR, formatKg } from "@/lib/api";
import { Grid, Calendar, Clock, BarChart } from "lucide-react";

interface WasteHeatmapSectionProps {
  heatmapData: HeatmapCell[];
  dayOfWeekData: DayOfWeekMetric[];
}

type HeatmapMetric = "waste_kg" | "waste_pct" | "waste_per_guest" | "waste_cost";

export const WasteHeatmapSection: React.FC<WasteHeatmapSectionProps> = ({
  heatmapData,
  dayOfWeekData,
}) => {
  const [metric, setMetric] = useState<HeatmapMetric>("waste_kg");

  if (!heatmapData || heatmapData.length === 0) return null;

  // Extract distinct days/dates and sessions
  const daysOrDates = Array.from(new Set(heatmapData.map((h) => h.day_or_date)));
  const sessions = Array.from(new Set(heatmapData.map((h) => h.session)));

  // Calculate min & max for intensity
  const getCellMetricVal = (cell?: HeatmapCell) => {
    if (!cell) return 0;
    if (metric === "waste_kg") return cell.waste_kg;
    if (metric === "waste_pct") return cell.waste_pct;
    if (metric === "waste_per_guest") return cell.waste_per_guest_g;
    return cell.waste_cost;
  };

  const values = heatmapData.map(getCellMetricVal);
  const maxVal = Math.max(...values, 1);

  const getIntensityColor = (val: number) => {
    if (val === 0) return "bg-slate-100 text-slate-400";
    const ratio = val / maxVal;
    if (ratio < 0.25) return "bg-emerald-100 text-emerald-900 font-semibold";
    if (ratio < 0.5) return "bg-amber-100 text-amber-900 font-semibold";
    if (ratio < 0.75) return "bg-orange-200 text-orange-950 font-bold";
    return "bg-rose-500 text-white font-black shadow-xs";
  };

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-6">
      {/* Header and Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Shift Waste Intensity Heatmap & Day-of-Week Patterns
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify recurring operational waste spikes across meal sessions and days of the week
          </p>
        </div>

        {/* Metric Segmented Control */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setMetric("waste_kg")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              metric === "waste_kg"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Waste (Kg)
          </button>
          <button
            onClick={() => setMetric("waste_pct")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              metric === "waste_pct"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Waste %
          </button>
          <button
            onClick={() => setMetric("waste_per_guest")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              metric === "waste_per_guest"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Waste/Guest
          </button>
          <button
            onClick={() => setMetric("waste_cost")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              metric === "waste_cost"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cost (₹)
          </button>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-center text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 text-left">Day / Date</th>
              {sessions.map((sess) => (
                <th key={sess} className="py-3 px-3">
                  {sess}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {daysOrDates.map((day) => (
              <tr key={day} className="hover:bg-slate-50/60">
                <td className="py-3 px-4 text-left font-bold text-slate-800">{day}</td>
                {sessions.map((sess) => {
                  const cell = heatmapData.find(
                    (h) => h.day_or_date === day && h.session === sess
                  );
                  const val = getCellMetricVal(cell);
                  const colorClass = getIntensityColor(val);

                  return (
                    <td key={sess} className="p-1.5">
                      <div
                        className={`py-2 px-3 rounded-xl transition-all ${colorClass}`}
                        title={`${day} - ${sess}: ${
                          cell ? `${cell.waste_kg} kg (${cell.waste_pct}%)` : "No record"
                        }`}
                      >
                        {val === 0 ? (
                          "—"
                        ) : metric === "waste_cost" ? (
                          formatINR(val)
                        ) : metric === "waste_pct" ? (
                          `${val.toFixed(1)}%`
                        ) : metric === "waste_per_guest" ? (
                          `${val.toFixed(0)}g`
                        ) : (
                          `${val.toFixed(1)} kg`
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Day of Week Summary Cards */}
      {dayOfWeekData.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Recurring Day-of-Week Averages
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {dayOfWeekData.map((d) => (
              <div
                key={d.day}
                className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-center"
              >
                <span className="text-xs font-bold text-slate-800 block mb-1">{d.day}</span>
                <div className="text-[11px] font-black text-rose-700">
                  {formatKg(d.avg_waste_kg)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {d.avg_waste_pct.toFixed(1)}% rate
                </div>
                <div className="text-[9px] text-slate-400 mt-1">
                  ~{d.avg_pax.toLocaleString("en-IN")} pax
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
