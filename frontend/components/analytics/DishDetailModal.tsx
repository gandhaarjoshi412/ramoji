"use client";

import React from "react";
import { DishDrillDownDetail } from "@/types/analytics";
import { formatINR, formatKg } from "@/lib/api";
import {
  X,
  UtensilsCrossed,
  ChefHat,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  Layers,
  TrendingDown,
  Info,
} from "lucide-react";

interface DishDetailModalProps {
  dish: DishDrillDownDetail | null;
  onClose: () => void;
}

export const DishDetailModal: React.FC<DishDetailModalProps> = ({ dish, onClose }) => {
  if (!dish) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                {dish.category}
              </span>
              <span className="text-xs text-slate-400 font-semibold">Dish Deep Drill-Down</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-slate-900 mt-1">
              {dish.dish_name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical recipe yield, portion variance, and unconsumed buffet analysis
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top 6 Mini KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Prepared</span>
            <span className="text-sm font-black text-slate-900">{formatKg(dish.total_prepared_kg)}</span>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Consumed</span>
            <span className="text-sm font-black text-emerald-950">{formatKg(dish.total_consumed_kg)}</span>
          </div>

          <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200/80">
            <span className="text-[10px] text-rose-700 font-bold uppercase block">Final Waste</span>
            <span className="text-sm font-black text-rose-950">{formatKg(dish.total_waste_kg)}</span>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
            <span className="text-[10px] text-amber-700 font-bold uppercase block">Waste Rate</span>
            <span className="text-sm font-black text-amber-950">{dish.waste_percentage.toFixed(2)}%</span>
          </div>

          <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200/80">
            <span className="text-[10px] text-purple-700 font-bold uppercase block">Waste / Guest</span>
            <span className="text-sm font-black text-purple-950">{dish.waste_per_guest_g.toFixed(1)}g</span>
          </div>

          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Waste Cost</span>
            <span className="text-sm font-black text-emerald-400">{formatINR(dish.total_waste_cost)}</span>
          </div>
        </div>

        {/* Observation & Recommendation Alert */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-blue-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-700" />
              Operational Observation
            </div>
            <p className="text-blue-950 font-medium leading-relaxed">{dish.observation}</p>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-emerald-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              Kitchen Recommendation
            </div>
            <p className="text-emerald-950 font-medium leading-relaxed">{dish.recommendation}</p>
          </div>
        </div>

        {/* Session Breakdown */}
        {dish.session_breakdown.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Performance by Meal Session
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Session</th>
                    <th className="p-2.5 text-right">Prepared (Kg)</th>
                    <th className="p-2.5 text-right">Consumed (Kg)</th>
                    <th className="p-2.5 text-right">Waste (Kg)</th>
                    <th className="p-2.5 text-right">Waste %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dish.session_breakdown.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{s.session}</td>
                      <td className="p-2.5 text-right text-slate-800">{formatKg(s.prepared_kg)}</td>
                      <td className="p-2.5 text-right text-emerald-700 font-bold">{formatKg(s.consumed_kg)}</td>
                      <td className="p-2.5 text-right text-rose-700 font-bold">{formatKg(s.waste_kg)}</td>
                      <td className="p-2.5 text-right font-black">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            s.waste_percentage > 8
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {s.waste_percentage.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Event Breakdown */}
        {dish.event_breakdown.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Banquet Event History
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Event Name</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5 text-right">Pax</th>
                    <th className="p-2.5 text-right">Prepared</th>
                    <th className="p-2.5 text-right">Consumed</th>
                    <th className="p-2.5 text-right">Waste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dish.event_breakdown.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{ev.event_name}</td>
                      <td className="p-2.5 text-slate-600">{ev.date}</td>
                      <td className="p-2.5 text-right text-slate-700">{ev.pax}</td>
                      <td className="p-2.5 text-right text-slate-800">{formatKg(ev.prepared_kg)}</td>
                      <td className="p-2.5 text-right text-emerald-700">{formatKg(ev.consumed_kg)}</td>
                      <td className="p-2.5 text-right text-rose-700 font-bold">{formatKg(ev.waste_kg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            Close Drill-Down
          </button>
        </div>
      </div>
    </div>
  );
};
