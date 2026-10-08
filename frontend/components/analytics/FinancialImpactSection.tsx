"use client";

import React, { useState } from "react";
import { FinancialImpactData } from "@/types/analytics";
import { formatINR, formatKg } from "@/lib/api";
import {
  IndianRupee,
  TrendingDown,
  Calculator,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface FinancialImpactSectionProps {
  financials: FinancialImpactData;
}

export const FinancialImpactSection: React.FC<FinancialImpactSectionProps> = ({
  financials,
}) => {
  const [selectedReduction, setSelectedReduction] = useState<number>(10);

  const activeTier =
    financials.savings_simulator.find((s) => s.reduction_pct === selectedReduction) ||
    financials.savings_simulator[0];

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Culinary Financial Impact & Savings Simulator
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Recipe ingredient cost attribution, cost per patron, and potential savings projection
          </p>
        </div>

        <div className="px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-xl text-xs font-bold text-amber-900 self-start sm:self-auto flex items-center gap-1.5">
          <IndianRupee className="w-3.5 h-3.5 text-amber-600" />
          <span>Total Loss: {formatINR(financials.total_waste_cost)}</span>
        </div>
      </div>

      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
            Waste Cost / Guest
          </span>
          <div className="text-lg font-black text-slate-900">
            {formatINR(financials.waste_cost_per_guest)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Per attended patron</span>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
            Waste Cost / Kg
          </span>
          <div className="text-lg font-black text-slate-900">
            {formatINR(financials.waste_cost_per_kg)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Weighted ingredient yield</span>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
            Food Consumed / Guest
          </span>
          <div className="text-lg font-black text-emerald-700">
            {formatINR(financials.cost_consumed_per_guest)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Raw food intake value</span>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-300 font-bold uppercase block">
              Annualized Estimate
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-semibold">
              Projected
            </span>
          </div>
          <div className="text-lg font-black text-emerald-400">
            {formatINR(financials.annualized_estimate_inr)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Based on run-rate</span>
        </div>
      </div>

      {/* Interactive Savings Simulator */}
      <div className="p-5 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 rounded-2xl text-white border border-emerald-900/40 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white tracking-wide">
                Operational Waste Reduction Simulator
              </h4>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Simulate the direct bottom-line impact of reducing buffet leftover through tighter batch production
            </p>
          </div>

          {/* Reduction Percentage Buttons */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
            {[10, 20, 30].map((pct) => (
              <button
                key={pct}
                onClick={() => setSelectedReduction(pct)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedReduction === pct
                    ? "bg-emerald-500 text-slate-950 shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                -{pct}% Waste
              </button>
            ))}
          </div>
        </div>

        {/* Simulator Projected Impact Cards */}
        {activeTier && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Projected Monthly Savings
              </span>
              <div className="text-xl font-black text-emerald-400">
                {formatINR(activeTier.monthly_savings_inr)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Direct kitchen savings</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Projected Annual Savings
              </span>
              <div className="text-xl font-black text-emerald-400">
                {formatINR(activeTier.annual_savings_inr)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Full year impact</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Food Diverted Annually
              </span>
              <div className="text-xl font-black text-teal-300">
                {formatKg(activeTier.waste_reduced_kg * 12)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Less waste to landfill</span>
            </div>
          </div>
        )}

        <p className="text-[10px] text-slate-400 italic">
          * {financials.projection_disclaimer}
        </p>
      </div>
    </div>
  );
};
