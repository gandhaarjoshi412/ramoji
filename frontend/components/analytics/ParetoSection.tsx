"use client";

import React from "react";
import { ParetoItem } from "@/types/analytics";
import { formatKg } from "@/lib/api";
import { BarChart3, AlertCircle, Sparkles } from "lucide-react";

interface ParetoSectionProps {
  paretoItems: ParetoItem[];
  totalWasteKg: number;
}

export const ParetoSection: React.FC<ParetoSectionProps> = ({
  paretoItems,
  totalWasteKg,
}) => {
  if (!paretoItems || paretoItems.length === 0) return null;

  // Find how many dishes make up 80% of waste
  const cutoff80Idx = paretoItems.findIndex((p) => p.cumulative_waste_percentage >= 80);
  const vitalFewCount = cutoff80Idx >= 0 ? cutoff80Idx + 1 : paretoItems.length;
  const topSharePct =
    cutoff80Idx >= 0
      ? paretoItems[cutoff80Idx].cumulative_waste_percentage.toFixed(0)
      : (paretoItems[paretoItems.length - 1]?.cumulative_waste_percentage || 100).toFixed(0);

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Pareto 80/20 Waste Analysis
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify the vital few menu items responsible for the overwhelming majority of culinary food waste
          </p>
        </div>

        <div className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 self-start sm:self-auto flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>
            Top {vitalFewCount} dish{vitalFewCount > 1 ? "es" : ""} produce {topSharePct}% of waste
          </span>
        </div>
      </div>

      {/* Visual Pareto Cumulative Curve + Bars */}
      <div className="space-y-3">
        {paretoItems.slice(0, 10).map((item, idx) => (
          <div key={item.dish_name} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-800 flex items-center gap-2">
                <span className="text-slate-400 font-mono text-[10px] w-4">#{idx + 1}</span>
                <strong>{item.dish_name}</strong>
                <span className="text-[10px] text-slate-400 font-normal">({item.category})</span>
              </span>
              <div className="flex items-center gap-4 text-right">
                <span className="text-slate-700 font-bold">{formatKg(item.waste_kg)}</span>
                <span className="text-slate-500 w-14">{item.waste_percentage_of_total.toFixed(1)}% of total</span>
                <span className="font-black text-amber-700 w-16">
                  {item.cumulative_waste_percentage.toFixed(1)}% cum.
                </span>
              </div>
            </div>

            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              {/* Individual dish contribution */}
              <div
                style={{ width: `${Math.min(100, item.waste_percentage_of_total)}%` }}
                className="h-full bg-rose-500 rounded-full"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">
          Management Action: Standardizing portion controls for these {vitalFewCount} dishes will eliminate over {topSharePct}% of total kitchen waste.
        </span>
      </div>
    </div>
  );
};
