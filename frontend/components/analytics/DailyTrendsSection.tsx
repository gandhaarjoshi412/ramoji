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
type GranularityMode = "daily" | "weekly" | "monthly";

export const DailyTrendsSection: React.FC<DailyTrendsSectionProps> = ({
  trends,
  dateCoverage,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("volume");
  const [granularity, setGranularity] = useState<GranularityMode>("daily");
  const [activeMetrics, setActiveMetrics] = useState({
    production: true,
    consumption: true,
    waste: true,
    leftover: false,
    reuse: false,
  });

  const effectiveTrends: DailyTrendPoint[] = React.useMemo(() => {
    if (!trends || trends.length === 0 || granularity === "daily") {
      return trends || [];
    }

    if (granularity === "monthly") {
      const monthMap: Record<string, {
        points: DailyTrendPoint[];
        prod: number;
        cons: number;
        waste: number;
        cost: number;
        pax: number;
        left: number;
        reuse: number;
      }> = {};

      trends.forEach((t) => {
        const mKey = t.date.slice(0, 7); // YYYY-MM
        if (!monthMap[mKey]) {
          monthMap[mKey] = { points: [], prod: 0, cons: 0, waste: 0, cost: 0, pax: 0, left: 0, reuse: 0 };
        }
        monthMap[mKey].points.push(t);
        monthMap[mKey].prod += t.production_kg || 0;
        monthMap[mKey].cons += t.consumption_kg || 0;
        monthMap[mKey].waste += t.waste_kg || 0;
        monthMap[mKey].cost += t.waste_cost || 0;
        monthMap[mKey].pax += t.pax || 0;
        monthMap[mKey].left += t.leftover_kg || 0;
        monthMap[mKey].reuse += t.reuse_kg || 0;
      });

      return Object.entries(monthMap).map(([mKey, g]) => {
        const wp = g.prod > 0 ? (g.waste / g.prod) * 100 : 0;
        const wpg = g.pax > 0 ? (g.waste / g.pax) * 1000 : 0;
        return {
          date: mKey,
          production_kg: Number(g.prod.toFixed(1)),
          consumption_kg: Number(g.cons.toFixed(1)),
          waste_kg: Number(g.waste.toFixed(1)),
          waste_cost: Number(g.cost.toFixed(0)),
          waste_percentage: Number(wp.toFixed(1)),
          waste_per_guest_g: Number(wpg.toFixed(0)),
          pax: g.pax,
          leftover_kg: Number(g.left.toFixed(1)),
          reuse_kg: Number(g.reuse.toFixed(1)),
        };
      });
    }

    if (granularity === "weekly") {
      const weekMap: Record<string, {
        points: DailyTrendPoint[];
        prod: number;
        cons: number;
        waste: number;
        cost: number;
        pax: number;
        left: number;
        reuse: number;
        startDate: string;
      }> = {};

      trends.forEach((t) => {
        // True calendar week calculation based on Monday
        const d = new Date(t.date + "T00:00:00");
        let mondayStr = t.date;
        if (!isNaN(d.getTime())) {
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          const mon = new Date(new Date(t.date + "T00:00:00").setDate(diff));
          mondayStr = mon.toISOString().slice(0, 10);
        }

        const mParts = mondayStr.split("-");
        const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mLabel = mParts.length === 3 ? `${mNames[Number(mParts[1]) - 1]} ${mParts[2]}` : mondayStr;
        const wKey = `Wk ${mLabel}`;

        if (!weekMap[wKey]) {
          weekMap[wKey] = { points: [], prod: 0, cons: 0, waste: 0, cost: 0, pax: 0, left: 0, reuse: 0, startDate: mondayStr };
        }
        weekMap[wKey].points.push(t);
        weekMap[wKey].prod += t.production_kg || 0;
        weekMap[wKey].cons += t.consumption_kg || 0;
        weekMap[wKey].waste += t.waste_kg || 0;
        weekMap[wKey].cost += t.waste_cost || 0;
        weekMap[wKey].pax += t.pax || 0;
        weekMap[wKey].left += t.leftover_kg || 0;
        weekMap[wKey].reuse += t.reuse_kg || 0;
      });

      return Object.entries(weekMap).map(([wLabel, g]) => {
        const wp = g.prod > 0 ? (g.waste / g.prod) * 100 : 0;
        const wpg = g.pax > 0 ? (g.waste / g.pax) * 1000 : 0;
        return {
          date: wLabel,
          production_kg: Number(g.prod.toFixed(1)),
          consumption_kg: Number(g.cons.toFixed(1)),
          waste_kg: Number(g.waste.toFixed(1)),
          waste_cost: Number(g.cost.toFixed(0)),
          waste_percentage: Number(wp.toFixed(1)),
          waste_per_guest_g: Number(wpg.toFixed(0)),
          pax: g.pax,
          leftover_kg: Number(g.left.toFixed(1)),
          reuse_kg: Number(g.reuse.toFixed(1)),
        };
      });
    }

    return trends || [];
  }, [trends, granularity]);

  if (!effectiveTrends || effectiveTrends.length === 0) {
    return (
      <div className="hotel-card p-8 bg-white border border-slate-200 text-center">
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-700">No Operational Trend Data Available</h4>
        <p className="text-xs text-slate-400 mt-1">
          Expand date filters to view day-over-day operational patterns.
        </p>
      </div>
    );
  }

  // Calculate overall trend: compare last day with first day
  const firstPoint = effectiveTrends[0];
  const lastPoint = effectiveTrends[effectiveTrends.length - 1];
  const wasteChangePct =
    firstPoint.waste_percentage > 0
      ? ((lastPoint.waste_percentage - firstPoint.waste_percentage) / firstPoint.waste_percentage) * 100
      : 0;
  const isImproving = wasteChangePct <= 0;

  // Maximum value for scaling the SVG chart
  let maxVal = 10;
  if (viewMode === "volume") {
    maxVal = Math.max(
      ...effectiveTrends.map((t) =>
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
    maxVal = Math.max(...effectiveTrends.map((t) => t.waste_percentage), 12);
  } else {
    maxVal = Math.max(...effectiveTrends.map((t) => t.waste_per_guest_g), 150);
  }

  // Chart dimensions - reserved 45px at bottom for rotated date ticks
  const svgWidth = 800;
  const svgHeight = 250;
  const paddingX = 50;
  const paddingY = 25;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY - 45;

  const getX = (idx: number) => {
    if (effectiveTrends.length === 1) return svgWidth / 2;
    return paddingX + (idx / (effectiveTrends.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(val, maxVal));
    return paddingY + plotHeight - (clamped / (maxVal || 1)) * plotHeight;
  };

  // Helper to calculate calendar days between two ISO date strings
  const getDaysDiff = (d1: string, d2: string): number => {
    try {
      const t1 = new Date(d1 + "T00:00:00").getTime();
      const t2 = new Date(d2 + "T00:00:00").getTime();
      if (isNaN(t1) || isNaN(t2)) return 1;
      return Math.abs(t2 - t1) / (1000 * 60 * 60 * 24);
    } catch {
      return 1;
    }
  };

  // Detect unrecorded operational gaps (> 2 days)
  const dateGaps = React.useMemo(() => {
    if (granularity !== "daily" || !effectiveTrends || effectiveTrends.length < 2) return [];
    const gaps: {
      fromIdx: number;
      toIdx: number;
      fromDate: string;
      toDate: string;
      diffDays: number;
      x1: number;
      x2: number;
    }[] = [];

    for (let i = 0; i < effectiveTrends.length - 1; i++) {
      const diff = getDaysDiff(effectiveTrends[i].date, effectiveTrends[i + 1].date);
      if (diff > 2) {
        gaps.push({
          fromIdx: i,
          toIdx: i + 1,
          fromDate: effectiveTrends[i].date,
          toDate: effectiveTrends[i + 1].date,
          diffDays: Math.round(diff),
          x1: getX(i),
          x2: getX(i + 1),
        });
      }
    }
    return gaps;
  }, [effectiveTrends, granularity]);

  // Create solid and bridged paths preventing false continuous plunge across unrecorded dates
  const createPathSegments = (dataExtractor: (t: DailyTrendPoint) => number) => {
    if (effectiveTrends.length === 0) return { solidSegments: [], bridgeSegments: [] };
    if (effectiveTrends.length === 1) {
      const x = svgWidth / 2;
      const y = getY(dataExtractor(effectiveTrends[0]));
      return {
        solidSegments: [`M ${x - 20} ${y} L ${x + 20} ${y}`],
        bridgeSegments: [],
      };
    }

    const solidSegments: string[] = [];
    const bridgeSegments: string[] = [];
    let currentSegment: string[] = [];

    effectiveTrends.forEach((t, i) => {
      const x = getX(i).toFixed(1);
      const y = getY(dataExtractor(t)).toFixed(1);

      if (i === 0) {
        currentSegment.push(`M ${x} ${y}`);
      } else {
        const prevT = effectiveTrends[i - 1];
        const diff = granularity === "daily" ? getDaysDiff(prevT.date, t.date) : 1;

        if (diff > 2) {
          if (currentSegment.length > 0) {
            solidSegments.push(currentSegment.join(" "));
            currentSegment = [];
          }
          const prevX = getX(i - 1).toFixed(1);
          const prevY = getY(dataExtractor(prevT)).toFixed(1);
          bridgeSegments.push(`M ${prevX} ${prevY} L ${x} ${y}`);
          currentSegment.push(`M ${x} ${y}`);
        } else {
          currentSegment.push(`L ${x} ${y}`);
        }
      }
    });

    if (currentSegment.length > 0) {
      solidSegments.push(currentSegment.join(" "));
    }

    return { solidSegments, bridgeSegments };
  };

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-5">
      {/* Header and Toggle Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Operational Waste Trends & Timeline
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
            Compare production quantity, guest consumption, and kitchen leftovers by day, week, or month
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Granularity Switcher: Daily / Weekly / Monthly */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setGranularity("daily")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                granularity === "daily"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setGranularity("weekly")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                granularity === "weekly"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setGranularity("monthly")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                granularity === "monthly"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
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

            {/* Unrecorded Period Visual Gaps Band & Indicator */}
            {dateGaps.map((gap, gIdx) => (
              <g key={`gap-${gIdx}`} className="pointer-events-none">
                <rect
                  x={gap.x1}
                  y={paddingY}
                  width={Math.max(4, gap.x2 - gap.x1)}
                  height={plotHeight}
                  fill="#f8fafc"
                  opacity="0.8"
                />
                <line
                  x1={gap.x1 + (gap.x2 - gap.x1) / 2}
                  y1={paddingY}
                  x2={gap.x1 + (gap.x2 - gap.x1) / 2}
                  y2={paddingY + plotHeight}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <g transform={`translate(${gap.x1 + (gap.x2 - gap.x1) / 2}, ${paddingY + 16})`}>
                  <rect
                    x="-42"
                    y="-9"
                    width="84"
                    height="18"
                    rx="9"
                    fill="#ffffff"
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    className="text-[9px] fill-slate-500 font-semibold"
                  >
                    {gap.diffDays}d Unrecorded
                  </text>
                </g>
              </g>
            ))}

            {/* Data Paths */}
            {viewMode === "volume" && (
              <>
                {/* Production Path */}
                {activeMetrics.production && (() => {
                  const { solidSegments, bridgeSegments } = createPathSegments((t) => t.production_kg);
                  return (
                    <g>
                      {bridgeSegments.map((d, bIdx) => (
                        <path
                          key={`prod-bridge-${bIdx}`}
                          d={d}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity="0.4"
                        />
                      ))}
                      {solidSegments.map((d, sIdx) => (
                        <path
                          key={`prod-solid-${sIdx}`}
                          d={d}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </g>
                  );
                })()}

                {/* Consumption Path */}
                {activeMetrics.consumption && (() => {
                  const { solidSegments, bridgeSegments } = createPathSegments((t) => t.consumption_kg);
                  return (
                    <g>
                      {bridgeSegments.map((d, bIdx) => (
                        <path
                          key={`cons-bridge-${bIdx}`}
                          d={d}
                          fill="none"
                          stroke="#059669"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity="0.4"
                        />
                      ))}
                      {solidSegments.map((d, sIdx) => (
                        <path
                          key={`cons-solid-${sIdx}`}
                          d={d}
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </g>
                  );
                })()}

                {/* Waste Path */}
                {activeMetrics.waste && (() => {
                  const { solidSegments, bridgeSegments } = createPathSegments((t) => t.waste_kg);
                  return (
                    <g>
                      {bridgeSegments.map((d, bIdx) => (
                        <path
                          key={`waste-bridge-${bIdx}`}
                          d={d}
                          fill="none"
                          stroke="#e11d48"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity="0.4"
                        />
                      ))}
                      {solidSegments.map((d, sIdx) => (
                        <path
                          key={`waste-solid-${sIdx}`}
                          d={d}
                          fill="none"
                          stroke="#e11d48"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </g>
                  );
                })()}

                {/* Leftover Path */}
                {activeMetrics.leftover && (() => {
                  const { solidSegments } = createPathSegments((t) => t.leftover_kg);
                  return solidSegments.map((d, sIdx) => (
                    <path
                      key={`left-solid-${sIdx}`}
                      d={d}
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  ));
                })()}

                {/* Reuse Path */}
                {activeMetrics.reuse && (() => {
                  const { solidSegments } = createPathSegments((t) => t.reuse_kg);
                  return solidSegments.map((d, sIdx) => (
                    <path
                      key={`reuse-solid-${sIdx}`}
                      d={d}
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                  ));
                })()}
              </>
            )}

            {viewMode === "waste_pct" && (() => {
              const { solidSegments, bridgeSegments } = createPathSegments((t) => t.waste_percentage);
              return (
                <g>
                  {bridgeSegments.map((d, bIdx) => (
                    <path
                      key={`wp-bridge-${bIdx}`}
                      d={d}
                      fill="none"
                      stroke="#e11d48"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.4"
                    />
                  ))}
                  {solidSegments.map((d, sIdx) => (
                    <path
                      key={`wp-solid-${sIdx}`}
                      d={d}
                      fill="none"
                      stroke="#e11d48"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              );
            })()}

            {viewMode === "waste_per_guest" && (() => {
              const { solidSegments, bridgeSegments } = createPathSegments((t) => t.waste_per_guest_g);
              return (
                <g>
                  {bridgeSegments.map((d, bIdx) => (
                    <path
                      key={`wpg-bridge-${bIdx}`}
                      d={d}
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.4"
                    />
                  ))}
                  {solidSegments.map((d, sIdx) => (
                    <path
                      key={`wpg-solid-${sIdx}`}
                      d={d}
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              );
            })()}

            {/* Data Points and Formatted X Axis Labels (Anti-Collision Rotation) */}
            {effectiveTrends.map((t, i) => {
              const x = getX(i);
              let activeVal = t.waste_kg;
              if (viewMode === "waste_pct") activeVal = t.waste_percentage;
              else if (viewMode === "waste_per_guest") activeVal = t.waste_per_guest_g;
              const y = getY(activeVal);

              const total = effectiveTrends.length;
              const step = total > 20 ? 3 : total > 10 ? 2 : 1;
              const isGapBorder = dateGaps.some((g) => g.fromIdx === i || g.toIdx === i);
              const showLabel = i === 0 || i === total - 1 || isGapBorder || i % step === 0;

              let formattedLabel = t.date;
              if (granularity === "monthly") {
                const [yr, mo] = t.date.split("-");
                const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                formattedLabel = `${mNames[Number(mo) - 1] || mo} '${yr ? yr.slice(2) : ""}`;
              } else if (granularity === "weekly") {
                formattedLabel = t.date;
              } else {
                const parts = t.date.split("-");
                if (parts.length === 3) {
                  const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const mName = mNames[Number(parts[1]) - 1] || parts[1];
                  formattedLabel = `${mName} ${parts[2]}`;
                }
              }

              return (
                <g key={i} className="group cursor-pointer">
                  {/* Point */}
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    className="fill-white stroke-slate-900 stroke-2 group-hover:scale-125 transition-transform"
                  />
                  {/* Formatted, Rotated, Non-Colliding Date Label */}
                  {showLabel && (
                    <text
                      x={x}
                      y={svgHeight - 8}
                      textAnchor="end"
                      transform={`rotate(-35, ${x}, ${svgHeight - 8})`}
                      className="text-[9.5px] fill-slate-500 font-medium tracking-tight select-none"
                    >
                      {formattedLabel}
                    </text>
                  )}
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
            {granularity === "monthly" ? "Avg Monthly Prepared" : granularity === "weekly" ? "Avg Weekly Prepared" : "Avg Daily Prepared"}
          </span>
          <span className="text-sm font-black text-slate-800">
            {formatKg(
              effectiveTrends.reduce((acc, t) => acc + t.production_kg, 0) / (effectiveTrends.length || 1)
            )}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {granularity === "monthly" ? "Avg Monthly Consumed" : granularity === "weekly" ? "Avg Weekly Consumed" : "Avg Daily Consumed"}
          </span>
          <span className="text-sm font-black text-emerald-700">
            {formatKg(
              effectiveTrends.reduce((acc, t) => acc + t.consumption_kg, 0) / (effectiveTrends.length || 1)
            )}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {granularity === "monthly" ? "Avg Monthly Waste" : granularity === "weekly" ? "Avg Weekly Waste" : "Avg Daily Waste"}
          </span>
          <span className="text-sm font-black text-rose-700">
            {formatKg(
              effectiveTrends.reduce((acc, t) => acc + t.waste_kg, 0) / (effectiveTrends.length || 1)
            )}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Avg Waste / Guest
          </span>
          <span className="text-sm font-black text-purple-700">
            {(
              effectiveTrends.reduce((acc, t) => acc + t.waste_per_guest_g, 0) / (effectiveTrends.length || 1)
            ).toFixed(1)}
            g
          </span>
        </div>
      </div>
    </div>
  );
};
