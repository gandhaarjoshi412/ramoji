"use client";

import React, { useState } from "react";
import {
  ChefHat,
  Utensils,
  Trash2,
  PackageOpen,
  Recycle,
  IndianRupee,
  Scale,
  Users,
  Info,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { ExecutiveKpis, MetricComparison } from "@/types/analytics";
import { formatINR, formatKg } from "@/lib/api";

interface ExecutiveKpiGridProps {
  kpis: ExecutiveKpis;
}

interface TooltipProps {
  text: string;
  formula?: string;
}

const KpiTooltip: React.FC<TooltipProps> = ({ text, formula }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(!open)}
        className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded cursor-pointer"
        aria-label="More information"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl z-50 pointer-events-none leading-relaxed border border-slate-700">
          <p className="font-medium text-slate-200">{text}</p>
          {formula && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-700/80 font-mono text-[10px] text-emerald-400">
              Formula: {formula}
            </div>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};

const ComparisonBadge: React.FC<{
  comp: MetricComparison;
  invertColor?: boolean; // For waste, a negative delta is GOOD (green)
}> = ({ comp, invertColor = false }) => {
  if (comp.previous === 0 && comp.current === 0) {
    return (
      <span className="text-[10px] font-semibold text-slate-400 inline-flex items-center gap-0.5">
        <Minus className="w-3 h-3" /> No prior data
      </span>
    );
  }

  const isZero = Math.abs(comp.percentage_change) < 0.1;
  if (isZero) {
    return (
      <span className="text-[10px] font-semibold text-slate-400 inline-flex items-center gap-0.5">
        <Minus className="w-3 h-3" /> Flat vs prior period
      </span>
    );
  }

  const isUp = comp.percentage_change > 0;
  // If invertColor is true (e.g. for Waste), isUp means waste increased = BAD (red).
  const isGood = invertColor ? !isUp : isUp;

  return (
    <span
      className={`text-[10px] font-bold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
        isGood
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
          : "bg-rose-50 text-rose-700 border border-rose-200/60"
      }`}
    >
      {isUp ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {Math.abs(comp.percentage_change).toFixed(1)}% vs prior
    </span>
  );
};

export const ExecutiveKpiGrid: React.FC<ExecutiveKpiGridProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Food Prepared */}
      <div className="hotel-card p-5 bg-white border border-slate-200/80 flex flex-col justify-between hover:border-slate-300">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center">
              Total Food Prepared
              <KpiTooltip
                text="Cumulative weight of food actually prepared/cooked across all selected sessions and banquets."
                formula="Sum(Actually Cooked in Kg)"
              />
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatKg(kpis.total_food_prepared_kg.current)}
            </span>
          </div>

          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <span>
              {kpis.food_prepared_per_guest_g.current > 0
                ? `${kpis.food_prepared_per_guest_g.current.toFixed(0)}g per guest`
                : "N/A per guest"}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <ComparisonBadge comp={kpis.total_food_prepared_kg} />
          <span className="text-[10px] text-slate-400 font-medium">Production Volume</span>
        </div>
      </div>

      {/* 2. Total Food Consumed */}
      <div className="hotel-card p-5 bg-white border border-slate-200/80 flex flex-col justify-between hover:border-slate-300">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center">
              Total Food Consumed
              <KpiTooltip
                text="Total quantity of prepared food consumed by guests during meal services."
                formula="Sum(Actual Consumption in Kg)"
              />
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Utensils className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {formatKg(kpis.total_food_consumed_kg.current)}
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              {kpis.consumption_rate_pct.current.toFixed(1)}% rate
            </span>
          </div>

          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <span>
              {kpis.consumption_per_guest_g.current > 0
                ? `${kpis.consumption_per_guest_g.current.toFixed(0)}g consumed / guest`
                : "N/A"}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <ComparisonBadge comp={kpis.total_food_consumed_kg} />
          <span className="text-[10px] text-slate-400 font-medium">Guest Intake</span>
        </div>
      </div>

      {/* 3. Total Food Waste */}
      <div className="hotel-card p-5 bg-white border border-rose-200/80 flex flex-col justify-between hover:border-rose-300 shadow-xs">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center">
              Total Food Waste
              <KpiTooltip
                text="Actual final food waste discarded, excluding safely reused food."
                formula="Total Waste (Kg) ÷ Actual Prepared (Kg) × 100"
              />
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700 tracking-tight">
              {formatKg(kpis.total_food_waste_kg.current)}
            </span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {kpis.waste_rate_pct.current.toFixed(2)}% waste
            </span>
          </div>

          <div className="mt-1 text-xs text-rose-600/90 flex items-center gap-1 font-medium">
            <span>
              {kpis.waste_per_guest_g.current > 0
                ? `${kpis.waste_per_guest_g.current.toFixed(1)}g waste per guest`
                : "0g / guest"}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between">
          <ComparisonBadge comp={kpis.total_food_waste_kg} invertColor={true} />
          <span className="text-[10px] text-rose-500 font-medium">Discarded Loss</span>
        </div>
      </div>

      {/* 4. Total Waste Cost */}
      <div className="hotel-card p-5 bg-white border border-amber-200/80 flex flex-col justify-between hover:border-amber-300">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center">
              Total Waste Cost
              <KpiTooltip
                text="Direct financial value lost from wasted dishes based on standardized item recipes & ingredient costing."
                formula="Sum(Waste Qty × Recipe Unit Cost)"
              />
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900 tracking-tight">
              {formatINR(kpis.total_waste_cost.current)}
            </span>
          </div>

          <div className="mt-1 text-xs text-amber-700/80 flex items-center gap-1 font-medium">
            <span>
              {kpis.waste_cost_per_guest.current > 0
                ? `${formatINR(kpis.waste_cost_per_guest.current)} cost per guest`
                : "₹0 / guest"}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between">
          <ComparisonBadge comp={kpis.total_waste_cost} invertColor={true} />
          <span className="text-[10px] text-amber-600 font-medium">Financial Impact</span>
        </div>
      </div>

      {/* 5. Total Leftover */}
      <div className="hotel-card p-5 bg-white border border-slate-200/80 flex flex-col justify-between hover:border-slate-300">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center">
              Total Leftover
              <KpiTooltip
                text="Unconsumed food divided strictly between kitchen leftovers (unserved) and buffet returns."
                formula="Kitchen Leftover + Buffet Return"
              />
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <PackageOpen className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatKg(kpis.total_leftover_kg.current)}
            </span>
          </div>

          <div className="mt-1 text-xs text-slate-500 font-medium">
            <span>
              Kitchen: {formatKg(kpis.kitchen_leftover_kg.current)} • Buffet: {formatKg(kpis.buffet_leftover_kg.current)}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <ComparisonBadge comp={kpis.total_leftover_kg} invertColor={true} />
          <span className="text-[10px] text-slate-400 font-medium">Unconsumed Food</span>
        </div>
      </div>

      {/* 6. Food Reused / Diverted */}
      <div className="hotel-card p-5 bg-white border border-slate-200/80 flex flex-col justify-between hover:border-slate-300">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center">
              Food Diverted / Reused
              <KpiTooltip
                text="Food safely repurposed or logged for controlled reuse per food safety protocols."
                formula="Reused Food (Kg) ÷ Total Leftover (Kg) × 100"
              />
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Recycle className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-700 tracking-tight">
              {formatKg(kpis.food_reused_kg.current)}
            </span>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
              {kpis.reuse_rate_pct.current.toFixed(1)}% of leftover
            </span>
          </div>

          <div className="mt-1 text-xs text-slate-500 font-medium">
            <span>{formatKg(kpis.food_diverted_kg.current)} prevented from waste</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <ComparisonBadge comp={kpis.food_reused_kg} />
          <span className="text-[10px] text-teal-600 font-medium">Waste Prevention</span>
        </div>
      </div>

      {/* 7. Prepared vs Planned (Variance) */}
      <div className="hotel-card p-5 bg-white border border-slate-200/80 flex flex-col justify-between hover:border-slate-300">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center">
              Prepared vs Planned
              <KpiTooltip
                text="Difference between actual production and chef's initial estimated requirement."
                formula="Actual Cooked (Kg) - Estimated Production (Kg)"
              />
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {kpis.production_variance_kg.current >= 0 ? "+" : ""}
              {formatKg(kpis.production_variance_kg.current)}
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
              {kpis.production_variance_pct.current >= 0 ? "+" : ""}
              {kpis.production_variance_pct.current.toFixed(1)}%
            </span>
          </div>

          <div className="mt-1 text-xs text-slate-500 font-medium">
            <span>
              {kpis.production_variance_kg.current > 0
                ? "Over-production buffer"
                : kpis.production_variance_kg.current < 0
                ? "Under-production deficit"
                : "Exact match with plan"}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-500">
            {kpis.production_variance_pct.current <= 5 ? "High Accuracy" : "Buffer Drift"}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Recipe Accuracy</span>
        </div>
      </div>

      {/* 8. Total Guests / Pax */}
      <div className="hotel-card p-5 bg-white border border-slate-200/80 flex flex-col justify-between hover:border-slate-300">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center">
              Guests Served (Pax)
              <KpiTooltip
                text="Total recorded attendance / guest covers across banquets and dining sessions."
                formula="Sum(Guest Pax Count)"
              />
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {kpis.total_guests.current.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-bold text-slate-500">guests</span>
          </div>

          <div className="mt-1 text-xs text-slate-500 font-medium">
            <span>Total banquet & restaurant patrons</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <ComparisonBadge comp={kpis.total_guests} />
          <span className="text-[10px] text-slate-400 font-medium">Patron Volume</span>
        </div>
      </div>
    </div>
  );
};
