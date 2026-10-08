"use client";

import React, { useState } from "react";
import { EventPerformanceRow, PerformanceStatus } from "@/types/analytics";
import { formatINR, formatKg } from "@/lib/api";
import {
  Calendar,
  Building2,
  Users,
  ShieldAlert,
  Sliders,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Flame,
} from "lucide-react";

interface EventPerformanceSectionProps {
  events: EventPerformanceRow[];
}

export const EventPerformanceSection: React.FC<EventPerformanceSectionProps> = ({ events }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [thresholds, setThresholds] = useState({
    excellent: 3.0,
    good: 5.0,
    moderate: 8.0,
    needsAttention: 12.0,
  });

  const getCustomStatus = (wastePct: number): PerformanceStatus => {
    if (wastePct <= thresholds.excellent) return "Excellent";
    if (wastePct <= thresholds.good) return "Good";
    if (wastePct <= thresholds.moderate) return "Moderate";
    if (wastePct <= thresholds.needsAttention) return "Needs Attention";
    return "Critical";
  };

  const getStatusBadge = (status: PerformanceStatus) => {
    switch (status) {
      case "Excellent":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Good":
        return "bg-teal-100 text-teal-800 border-teal-300";
      case "Moderate":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Needs Attention":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Critical":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="hotel-card p-6 bg-white border border-slate-200 text-center">
        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-700">No Event Records Found</h4>
        <p className="text-xs text-slate-400 mt-1">Adjust filters or upload banquet reports.</p>
      </div>
    );
  }

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-5">
      {/* Header and Threshold Config Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Banquet & Event Performance
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Event-level operational tracking with automated classification based on configurable waste thresholds
          </p>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          {showConfig ? "Hide Thresholds" : "Configure Thresholds"}
        </button>
      </div>

      {/* Configurable Threshold Drawer */}
      {showConfig && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3 animate-in fade-in">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            Administrator Waste % Classification Thresholds
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Excellent (≤ %)
              </label>
              <input
                type="number"
                step="0.5"
                value={thresholds.excellent}
                onChange={(e) =>
                  setThresholds({ ...thresholds, excellent: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Good (≤ %)
              </label>
              <input
                type="number"
                step="0.5"
                value={thresholds.good}
                onChange={(e) =>
                  setThresholds({ ...thresholds, good: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Moderate (≤ %)
              </label>
              <input
                type="number"
                step="0.5"
                value={thresholds.moderate}
                onChange={(e) =>
                  setThresholds({ ...thresholds, moderate: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Needs Attention (≤ %)
              </label>
              <input
                type="number"
                step="0.5"
                value={thresholds.needsAttention}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    needsAttention: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* Events Performance Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Event Name & Details</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3 text-right">Pax</th>
              <th className="py-3 px-3 text-right">Estimated (Kg)</th>
              <th className="py-3 px-3 text-right">Cooked (Kg)</th>
              <th className="py-3 px-3 text-right">Consumed (Kg)</th>
              <th className="py-3 px-3 text-right">Leftover (Kg)</th>
              <th className="py-3 px-3 text-right">Reused (Kg)</th>
              <th className="py-3 px-3 text-right">Waste (Kg)</th>
              <th className="py-3 px-3 text-right">Waste %</th>
              <th className="py-3 px-3 text-right">Waste/Pax</th>
              <th className="py-3 px-3 text-right">Waste Cost</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {events.map((ev) => {
              const status = getCustomStatus(ev.waste_percentage);
              return (
                <tr key={ev.event_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{ev.event_name}</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      {ev.hotel} {ev.location ? `• ${ev.location}` : ""} • {ev.event_type}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-700 whitespace-nowrap">{ev.event_date}</td>
                  <td className="py-3 px-3 text-right text-slate-700 font-bold">{ev.pax.toLocaleString("en-IN")}</td>
                  <td className="py-3 px-3 text-right text-slate-600">{formatKg(ev.estimated_kg)}</td>
                  <td className="py-3 px-3 text-right text-slate-900 font-bold">{formatKg(ev.actual_production_kg)}</td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-bold">{formatKg(ev.consumption_kg)}</td>
                  <td className="py-3 px-3 text-right text-amber-700">{formatKg(ev.leftover_kg)}</td>
                  <td className="py-3 px-3 text-right text-teal-700">{formatKg(ev.reuse_kg)}</td>
                  <td className="py-3 px-3 text-right text-rose-700 font-bold">{formatKg(ev.waste_kg)}</td>
                  <td className="py-3 px-3 text-right font-black">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusBadge(
                        status
                      )}`}
                    >
                      {ev.waste_percentage.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700 font-mono">
                    {ev.waste_per_guest_g.toFixed(1)} g
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    {formatINR(ev.waste_cost)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(
                        status
                      )}`}
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
