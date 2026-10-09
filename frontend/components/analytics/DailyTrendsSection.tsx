"use client";

import React, { useState } from "react";
import { DailyTrendPoint, DateCoverageData } from "@/types/analytics";
import { formatKg } from "@/lib/api";
import {
  TrendingDown,
  TrendingUp,
  Calendar,
  Activity,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

interface DailyTrendsSectionProps {
  trends: DailyTrendPoint[];
  dateCoverage?: DateCoverageData;
}

type ViewMode = "volume" | "waste_pct" | "waste_per_guest";

export const DailyTrendsSection: React.FC<DailyTrendsSectionProps> = ({
  trends,
  dateCoverage,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("volume");
  const [activeMetrics, setActiveMetrics] = useState({
    production: true,
    consumption: true,
    waste: true,
    leftover: false,
    reuse: false,
  });

  if (!trends || trends.length === 0) {
    return (
      <div className="hotel-card p-8 bg-white border border-slate-200 text-center">
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-700">No Daily Trend Data Available</h4>
        <p className="text-xs text-slate-400 mt-1">
          Expand date filters to view day-over-day operational patterns.
        </p>
      </div>
    );
  }

  // Calculate overall trend: compare last day with first day
  const firstPoint = trends[0];
  const lastPoint = trends[trends.length - 1];
  const wasteChangePct =
    firstPoint.waste_percentage > 0
      ? ((lastPoint.waste_percentage - firstPoint.waste_percentage) / firstPoint.waste_percentage) * 100
      : 0;
  const isImproving = wasteChangePct <= 0;

  // Maximum value for scaling the SVG chart
  let maxVal = 10;
  if (viewMode === "volume") {
    maxVal = Math.max(
      ...trends.map((t) =>
        Math.max(
          activeMetrics.production ? t.production_kg : 0,
          activeMetrics.consumption ? t.consumption_kg : 0,
          activeMetrics.waste ? t.waste_kg : 0,
          activeMetrics.leftover ? t.leftover_kg : 0,
          activeMetrics.reuse ? t.reuse_kg : 0
        )
      ),
      10
    );
  } else if (viewMode === "waste_pct") {
    maxVal = Math.max(...trends.map((t) => t.waste_percentage), 12);
  } else {
    maxVal = Math.max(...trends.map((t) => t.waste_per_guest_g), 150);
  }

  // Chart dimensions
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingX = 50;
  const paddingY = 30;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY * 2;

  const getX = (idx: number) => {
    if (trends.length === 1) return svgWidth / 2;
    return paddingX + (idx / (trends.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(val, maxVal));
    return paddingY + plotHeight - (clamped / (maxVal || 1)) * plotHeight;
  };

  const createPath = (dataExtractor: (t: DailyTrendPoint) => number) => {
    if (trends.length === 1) {
      const x = svgWidth / 2;
      const y = getY(dataExtractor(trends[0]));
      return `M ${x - 20} ${y} L ${x + 20} ${y}`;
    }
    return trends
      .map((t, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(dataExtractor(t)).toFixed(1)}`)
      .join(" ");
  };

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-5">
      {/* Header and Toggle Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Daily Operational Trends
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isImproving
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-rose-50 text-rose-700 border border-rose-200/60"
              }`}
            >
              {isImproving ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {isImproving ? "Operations Improving" : "Waste Rate Elevated"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Day-over-day tracking of production quantity, guest consumption, and kitchen leftovers
          </p>
        </div>

        {/* View Mode Segmented Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setViewMode("volume")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              viewMode === "volume"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Volume (Kg)
          </button>
          <button
            onClick={() => setViewMode("waste_pct")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              viewMode === "waste_pct"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Waste %
          </button>
          <button
            onClick={() => setViewMode("waste_per_guest")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              viewMode === "waste_per_guest"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Waste / Guest (g)
          </button>
        </div>
      </div>

      {/* Sparse Observation Timeline Disclosure (Master Prompt Part B / Example 3) */}
      {dateCoverage?.is_sparse && (
        <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Timeline Coverage Disclosure: </span>
            <span>
              Culinary shift data is recorded for{" "}
              <strong>{dateCoverage.recorded_days_count}</strong> of{" "}
              <strong>{dateCoverage.calendar_days_count}</strong> calendar days in this range ({dateCoverage.calendar_start} to {dateCoverage.calendar_end}). Unrecorded days are kept distinct and never assumed to have zero waste, preventing false continuous interpolation.
            </span>
          </div>
        </div>
      )}

      {/* Metric Toggles (when Volume is active) */}
      {viewMode === "volume" && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-2">
            Toggle Metrics:
          </span>
          <button
            onClick={() =>
              setActiveMetrics((m) => ({ ...m, production: !m.production }))
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMetrics.production
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Production (Kg)
          </button>

          <button
            onClick={() =>
              setActiveMetrics((m) => ({ ...m, consumption: !m.consumption }))
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMetrics.consumption
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            Consumption (Kg)
          </button>

          <button
            onClick={() =>
              setActiveMetrics((m) => ({ ...m, waste: !m.waste }))
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMetrics.waste
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            Final Waste (Kg)
          </button>

          <button
            onClick={() =>
              setActiveMetrics((m) => ({ ...m, leftover: !m.leftover }))
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMetrics.leftover
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            Leftover (Kg)
          </button>

          <button
            onClick={() =>
              setActiveMetrics((m) => ({ ...m, reuse: !m.reuse }))
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMetrics.reuse
                ? "bg-teal-50 text-teal-700 border-teal-200"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-teal-600" />
            Reused (Kg)
          </button>
        </div>
      )}

      {/* Primary SVG Chart */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[640px]">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = paddingY + plotHeight * (1 - pct);
              const labelVal = maxVal * pct;
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={svgWidth - paddingX}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono font-medium"
                  >
                    {viewMode === "waste_pct"
                      ? `${labelVal.toFixed(1)}%`
                      : viewMode === "waste_per_guest"
                      ? `${labelVal.toFixed(0)}g`
                      : `${labelVal.toFixed(0)} kg`}
                  </text>
                </g>
              );
            })}

            {/* Target Threshold Line (if in Waste % mode, show 5% hospitality benchmark) */}
            {viewMode === "waste_pct" && (
              <g>
                <line
                  x1={paddingX}
                  y1={getY(5.0)}
                  x2={svgWidth - paddingX}
                  y2={getY(5.0)}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="6 3"
                />
                <text
                  x={svgWidth - paddingX}
                  y={getY(5.0) - 5}
                  textAnchor="end"
                  className="text-[10px] fill-emerald-600 font-bold"
                >
                  Benchmark Target: 5.0%
                </text>
              </g>
            )}

            {/* Data Paths */}
            {viewMode === "volume" && (
              <>
                {/* Production Path */}
                {activeMetrics.production && (
                  <path
                    d={createPath((t) => t.production_kg)}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {/* Consumption Path */}
                {activeMetrics.consumption && (
                  <path
                    d={createPath((t) => t.consumption_kg)}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {/* Waste Path */}
                {activeMetrics.waste && (
                  <path
                    d={createPath((t) => t.waste_kg)}
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {/* Leftover Path */}
                {activeMetrics.leftover && (
                  <path
                    d={createPath((t) => t.leftover_kg)}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                )}
                {/* Reuse Path */}
                {activeMetrics.reuse && (
                  <path
                    d={createPath((t) => t.reuse_kg)}
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                )}
              </>
            )}

            {viewMode === "waste_pct" && (
              <path
                d={createPath((t) => t.waste_percentage)}
                fill="none"
                stroke="#e11d48"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {viewMode === "waste_per_guest" && (
              <path
                d={createPath((t) => t.waste_per_guest_g)}
                fill="none"
                stroke="#7c3aed"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points and X Labels */}
            {trends.map((t, i) => {
              const x = getX(i);
              let activeVal = t.waste_kg;
              if (viewMode === "waste_pct") activeVal = t.waste_percentage;
              else if (viewMode === "waste_per_guest") activeVal = t.waste_per_guest_g;
              const y = getY(activeVal);

              return (
                <g key={i} className="group cursor-pointer">
                  {/* Point */}
                  <circle
                    cx={x}
                    cy={y}
                    r="4.5"
                    className="fill-white stroke-slate-900 stroke-2 group-hover:scale-125 transition-transform"
                  />
                  {/* Date label */}
                  <text
                    x={x}
                    y={svgHeight - 8}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-500 font-medium"
                  >
                    {t.date.slice(5)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Bottom Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Avg Daily Prepared
          </span>
          <span className="text-sm font-black text-slate-800">
            {formatKg(
              trends.reduce((acc, t) => acc + t.production_kg, 0) / (trends.length || 1)
            )}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Avg Daily Consumed
          </span>
          <span className="text-sm font-black text-emerald-700">
            {formatKg(
              trends.reduce((acc, t) => acc + t.consumption_kg, 0) / (trends.length || 1)
            )}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Avg Daily Waste
          </span>
          <span className="text-sm font-black text-rose-700">
            {formatKg(
              trends.reduce((acc, t) => acc + t.waste_kg, 0) / (trends.length || 1)
            )}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Avg Waste / Guest
          </span>
          <span className="text-sm font-black text-purple-700">
            {(
              trends.reduce((acc, t) => acc + t.waste_per_guest_g, 0) / (trends.length || 1)
            ).toFixed(1)}
            g
          </span>
        </div>
      </div>
    </div>
  );
};
