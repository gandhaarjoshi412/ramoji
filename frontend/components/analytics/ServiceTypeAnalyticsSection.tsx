"use client";

import React from "react";
import { ServiceTypeComparisonRow } from "@/types/analytics";
import { formatINR, formatKg } from "@/lib/api";
import { Layers, Utensils, Building2, BellRing, Users2 } from "lucide-react";

interface ServiceTypeAnalyticsSectionProps {
  serviceTypes: ServiceTypeComparisonRow[];
}

export const ServiceTypeAnalyticsSection: React.FC<ServiceTypeAnalyticsSectionProps> = ({
  serviceTypes,
}) => {
  if (!serviceTypes || serviceTypes.length === 0) {
    return null;
  }

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Service Type Operational Yield
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare waste and consumption dynamics across Buffet, À la carte, Banquet, Room Service, and Catering
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {serviceTypes.map((st) => (
          <div
            key={st.service_type}
            className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                {st.service_type}
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  st.waste_percentage > 7
                    ? "bg-rose-100 text-rose-800"
                    : st.waste_percentage > 4
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {st.waste_percentage.toFixed(2)}% waste
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Guests</span>
                <span className="font-black text-slate-800">{st.pax.toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Cooked</span>
                <span className="font-black text-slate-800">{formatKg(st.production_kg)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Consumed</span>
                <span className="font-black text-emerald-700">{formatKg(st.consumption_kg)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Waste Lost</span>
                <span className="font-black text-rose-700">{formatKg(st.waste_kg)}</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Waste/Guest: <strong className="text-slate-800">{st.waste_per_guest_g.toFixed(1)}g</strong>
              </span>
              <span className="text-slate-700 font-bold">
                Cost: <strong className="text-slate-900">{formatINR(st.waste_cost)}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
