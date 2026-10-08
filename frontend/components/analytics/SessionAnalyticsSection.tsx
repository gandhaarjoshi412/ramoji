"use client";

import React from "react";
import { SessionComparisonRow } from "@/types/analytics";
import { formatINR, formatKg } from "@/lib/api";
import {
  Clock,
  AlertTriangle,
  Flame,
  Award,
  Users,
  UtensilsCrossed,
  ArrowUpRight,
} from "lucide-react";

interface SessionAnalyticsSectionProps {
  sessions: SessionComparisonRow[];
}

export const SessionAnalyticsSection: React.FC<SessionAnalyticsSectionProps> = ({ sessions }) => {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="hotel-card p-6 bg-white border border-slate-200 text-center">
        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-700">No Session Data Available</h4>
        <p className="text-xs text-slate-400 mt-1">Select a broader filter range.</p>
      </div>
    );
  }

  // Find worst performing session (highest waste percentage or waste kg)
  const worstSession = sessions.reduce((prev, curr) =>
    curr.waste_percentage > prev.waste_percentage ? curr : prev
  , sessions[0]);

  // Find best performing session
  const bestSession = sessions.reduce((prev, curr) =>
    curr.waste_percentage < prev.waste_percentage ? curr : prev
  , sessions[0]);

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-6">
      {/* Header and Callout Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Session & Meal-Wise Operations
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational yield, buffet return, and guest waste rates across daily meal shifts
          </p>
        </div>

        {/* Worst Session Alert Badge */}
        {worstSession && (
          <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-rose-800">
                Highest Waste Shift: <span className="underline">{worstSession.session}</span>
              </div>
              <div className="text-xs font-semibold text-rose-950 mt-0.5">
                {formatKg(worstSession.waste_kg)} waste • {worstSession.waste_percentage.toFixed(2)}% rate • {worstSession.waste_per_guest_g.toFixed(1)}g / guest
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Session Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sessions.map((sess) => {
          const isWorst = sess.session === worstSession?.session;
          const isBest = sess.session === bestSession?.session && sessions.length > 1;

          return (
            <div
              key={sess.session}
              className={`p-4 rounded-xl border transition-all ${
                isWorst
                  ? "bg-rose-50/40 border-rose-200 shadow-xs"
                  : isBest
                  ? "bg-emerald-50/40 border-emerald-200 shadow-xs"
                  : "bg-slate-50 border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {sess.session}
                </span>
                {isWorst ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                    Worst Shift
                  </span>
                ) : isBest ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Best Shift
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Guests</span>
                  <span className="font-black text-slate-800">{sess.pax.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Cooked</span>
                  <span className="font-black text-slate-800">{formatKg(sess.production_kg)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Consumed</span>
                  <span className="font-black text-emerald-700">{formatKg(sess.consumption_kg)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Waste (Kg)</span>
                  <span className="font-black text-rose-700">{formatKg(sess.waste_kg)}</span>
                </div>
              </div>

              {/* Progress bar of Waste % */}
              <div className="mt-3 pt-2 border-t border-slate-200/60">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500">Waste Rate:</span>
                  <span className={sess.waste_percentage > 8 ? "text-rose-700 font-black" : "text-slate-800"}>
                    {sess.waste_percentage.toFixed(2)}% ({sess.waste_per_guest_g.toFixed(0)}g/head)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mt-1">
                  <div
                    style={{ width: `${Math.min(100, sess.waste_percentage * 5)}%` }}
                    className={`h-full rounded-full ${
                      sess.waste_percentage > 8 ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comprehensive Session Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Session</th>
              <th className="py-3 px-3 text-right">Pax</th>
              <th className="py-3 px-3 text-right">Cooked (Kg)</th>
              <th className="py-3 px-3 text-right">Consumed (Kg)</th>
              <th className="py-3 px-3 text-right">Leftover (Kg)</th>
              <th className="py-3 px-3 text-right">Reused (Kg)</th>
              <th className="py-3 px-3 text-right">Waste (Kg)</th>
              <th className="py-3 px-3 text-right">Waste %</th>
              <th className="py-3 px-3 text-right">Waste/Head</th>
              <th className="py-3 px-4 text-right">Waste Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {sessions.map((sess) => (
              <tr
                key={sess.session}
                className={`hover:bg-slate-50 transition-colors ${
                  sess.session === worstSession?.session ? "bg-rose-50/20" : ""
                }`}
              >
                <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {sess.session}
                </td>
                <td className="py-3 px-3 text-right text-slate-700">{sess.pax.toLocaleString("en-IN")}</td>
                <td className="py-3 px-3 text-right text-slate-900 font-semibold">{formatKg(sess.production_kg)}</td>
                <td className="py-3 px-3 text-right text-emerald-700 font-semibold">{formatKg(sess.consumption_kg)}</td>
                <td className="py-3 px-3 text-right text-amber-700">{formatKg(sess.leftover_kg)}</td>
                <td className="py-3 px-3 text-right text-teal-700">{formatKg(sess.reuse_kg)}</td>
                <td className="py-3 px-3 text-right text-rose-700 font-bold">{formatKg(sess.waste_kg)}</td>
                <td className="py-3 px-3 text-right font-black">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      sess.waste_percentage > 8
                        ? "bg-rose-100 text-rose-800 font-black"
                        : sess.waste_percentage > 5
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {sess.waste_percentage.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-slate-700 font-mono">
                  {sess.waste_per_guest_g.toFixed(1)} g
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {formatINR(sess.waste_cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
