"use client";

import React from "react";
import { FoodFlowData } from "@/types/analytics";
import { formatKg } from "@/lib/api";
import {
  ArrowRight,
  TrendingUp,
  PieChart,
  Layers,
  ChefHat,
  Utensils,
  PackageOpen,
  Recycle,
  Trash2,
  CheckCircle2,
} from "lucide-react";

interface ExecutiveOverviewSectionProps {
  foodFlow: FoodFlowData;
  wasteCostInr: number;
}

export const ExecutiveOverviewSection: React.FC<ExecutiveOverviewSectionProps> = ({
  foodFlow,
  wasteCostInr,
}) => {
  const prod = foodFlow.actual_production_kg || 1;
  const consPct = ((foodFlow.actual_consumption_kg / prod) * 100).toFixed(1);
  const leftoverPct = ((foodFlow.total_leftover_kg / prod) * 100).toFixed(1);
  const reusePct = ((foodFlow.reuse_kg / prod) * 100).toFixed(1);
  const wastePct = ((foodFlow.final_waste_kg / prod) * 100).toFixed(1);

  // Waste breakdown composition
  const buffetWasteKg = foodFlow.buffet_leftover_kg || 0;
  const kitchenWasteKg = foodFlow.kitchen_leftover_kg || 0;
  const reuseKg = foodFlow.reuse_kg || 0;
  const finalWasteKg = foodFlow.final_waste_kg || 0;
  const totalTrackedWasteKg = buffetWasteKg + kitchenWasteKg + reuseKg + finalWasteKg || 1;

  const buffetShare = ((buffetWasteKg / totalTrackedWasteKg) * 100).toFixed(1);
  const kitchenShare = ((kitchenWasteKg / totalTrackedWasteKg) * 100).toFixed(1);
  const reuseShare = ((reuseKg / totalTrackedWasteKg) * 100).toFixed(1);
  const finalWasteShare = ((finalWasteKg / totalTrackedWasteKg) * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Cols: Complete Food Flow Lifecycle (Sankey-style Horizontal Flow) */}
      <div className="lg:col-span-2 hotel-card p-6 bg-white border border-slate-200/80 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Culinary Food Flow & Lifecycle
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                End-to-end movement: Estimated Requirement → Production → Pickup → Intake → Unserved Leftover → Reuse & Waste
              </p>
            </div>
            <div className="px-3 py-1 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700 self-start sm:self-auto">
              Total Prepared: {formatKg(foodFlow.actual_production_kg)}
            </div>
          </div>

          {/* Interactive Flow Diagram */}
          <div className="mt-6 space-y-5">
            {/* Stage Cards Stream */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 relative">
              {/* 1. Estimated */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-center flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    1. Estimated
                  </span>
                  <div className="text-sm font-black text-slate-800">
                    {formatKg(foodFlow.estimated_kg)}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-2 font-medium">Chef's forecast</div>
              </div>

              {/* 2. Cooked / Prepared */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-center flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 block mb-1">
                    2. Prepared
                  </span>
                  <div className="text-sm font-black text-blue-950">
                    {formatKg(foodFlow.actual_production_kg)}
                  </div>
                </div>
                <div className="text-[10px] text-blue-700 mt-2 font-bold">100% Volume</div>
              </div>

              {/* 3. Pickup */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-center flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    3. Pickup
                  </span>
                  <div className="text-sm font-black text-slate-800">
                    {formatKg(foodFlow.pickup_kg)}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-2 font-medium">Dispatched to venue</div>
              </div>

              {/* 4. Consumed */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block mb-1">
                    4. Consumed
                  </span>
                  <div className="text-sm font-black text-emerald-950">
                    {formatKg(foodFlow.actual_consumption_kg)}
                  </div>
                </div>
                <div className="text-[10px] text-emerald-700 mt-2 font-bold">{consPct}% Consumed</div>
              </div>

              {/* 5. Leftover */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-center flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block mb-1">
                    5. Leftovers
                  </span>
                  <div className="text-sm font-black text-amber-950">
                    {formatKg(foodFlow.total_leftover_kg)}
                  </div>
                </div>
                <div className="text-[10px] text-amber-700 mt-2 font-medium">{leftoverPct}% Unserved</div>
              </div>

              {/* 6. Discarded Waste */}
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-center flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 block mb-1">
                    6. Final Waste
                  </span>
                  <div className="text-sm font-black text-rose-950">
                    {formatKg(foodFlow.final_waste_kg)}
                  </div>
                </div>
                <div className="text-[10px] text-rose-700 mt-2 font-bold">{wastePct}% Lost</div>
              </div>
            </div>

            {/* Visual Stream Proportion Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                <span>Food Allocation Balance</span>
                <span>
                  {foodFlow.actual_consumption_kg.toFixed(1)} kg consumed + {foodFlow.reuse_kg.toFixed(1)} kg reused + {foodFlow.final_waste_kg.toFixed(1)} kg waste
                </span>
              </div>
              <div className="h-5 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${Math.min(100, Math.max(0, Number(consPct)))}%` }}
                  className="bg-emerald-500 hover:bg-emerald-600 transition-all flex items-center justify-center text-[10px] font-black text-white"
                  title={`Consumed: ${foodFlow.actual_consumption_kg} kg (${consPct}%)`}
                >
                  {Number(consPct) > 15 ? `${consPct}%` : ""}
                </div>
                <div
                  style={{ width: `${Math.min(100, Math.max(0, Number(reusePct)))}%` }}
                  className="bg-teal-500 hover:bg-teal-600 transition-all flex items-center justify-center text-[10px] font-black text-white"
                  title={`Reused: ${foodFlow.reuse_kg} kg (${reusePct}%)`}
                >
                  {Number(reusePct) > 8 ? `${reusePct}%` : ""}
                </div>
                <div
                  style={{ width: `${Math.min(100, Math.max(0, Number(wastePct)))}%` }}
                  className="bg-rose-500 hover:bg-rose-600 transition-all flex items-center justify-center text-[10px] font-black text-white"
                  title={`Final Waste: ${foodFlow.final_waste_kg} kg (${wastePct}%)`}
                >
                  {Number(wastePct) > 6 ? `${wastePct}%` : ""}
                </div>
              </div>
            </div>

            {/* Flow Legend Notes */}
            <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Guest Consumption ({consPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-teal-500" />
                <span>Safely Reused ({formatKg(foodFlow.reuse_kg)})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span>Net Disposal Waste ({wastePct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Callout Bottom */}
        <div className="mt-6 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Operational Takeaway:</span>
            <span>
              {foodFlow.reuse_kg > 0
                ? `${formatKg(foodFlow.reuse_kg)} successfully diverted from waste bin.`
                : "Tight kitchen batching can capture unserved portions before buffet dispatch."}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Yield Audit Ready</span>
        </div>
      </div>

      {/* Right 1 Col: Waste Breakdown & Composition */}
      <div className="hotel-card p-6 bg-white border border-slate-200/80 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-serif text-base font-bold text-slate-900 tracking-tight">
                Waste Composition
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Source attribution of discarded & unconsumed food
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <PieChart className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {/* Buffet / Location Return */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Buffet / Location Returns</span>
                <span className="text-slate-900 font-bold">
                  {formatKg(buffetWasteKg)} ({buffetShare}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${buffetShare}%` }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
              <span className="text-[10px] text-slate-400">Returned from dining floor chafing dishes</span>
            </div>

            {/* Kitchen Leftover */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Kitchen Overproduction</span>
                <span className="text-slate-900 font-bold">
                  {formatKg(kitchenWasteKg)} ({kitchenShare}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${kitchenShare}%` }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
              <span className="text-[10px] text-slate-400">Pre-service hot holds in back-of-house kitchen</span>
            </div>

            {/* Safely Reused */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Safely Reused / Repurposed</span>
                <span className="text-teal-700 font-bold">
                  {formatKg(reuseKg)} ({reuseShare}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${reuseShare}%` }}
                  className="h-full bg-teal-500 rounded-full"
                />
              </div>
              <span className="text-[10px] text-slate-400">Compliant staff meal or blast-chilled repurposing</span>
            </div>

            {/* Net Landfill Waste */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-800 font-bold">Final Discarded Waste</span>
                <span className="text-rose-700 font-black">
                  {formatKg(finalWasteKg)} ({finalWasteShare}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${finalWasteShare}%` }}
                  className="h-full bg-rose-500 rounded-full"
                />
              </div>
              <span className="text-[10px] text-slate-400">Sent to municipal bin / compost disposal</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 flex items-center justify-between">
            <span className="font-medium">Total Tracked Unconsumed:</span>
            <span className="font-black text-slate-900">{formatKg(totalTrackedWasteKg)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
