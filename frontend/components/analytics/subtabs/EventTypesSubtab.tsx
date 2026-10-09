"use client";

import React, { useEffect, useState } from "react";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import {
  EventTypesAnalyticsResponse,
  EventTypeAnalyticsCategory,
} from "@/types/analytics";
import {
  Tags,
  Users,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

interface EventTypesSubtabProps {
  selectedHotel: string;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
}

export const EventTypesSubtab: React.FC<EventTypesSubtabProps> = ({
  selectedHotel,
  datePreset = "all",
  startDate,
  endDate,
}) => {
  const [data, setData] = useState<EventTypesAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Corporate");

  useEffect(() => {
    let isMounted = true;
    async function loadEventTypes() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        if (selectedHotel && selectedHotel !== "all") query.set("hotel", selectedHotel);
        if (datePreset) query.set("date_preset", datePreset);
        if (startDate) query.set("start_date", startDate);
        if (endDate) query.set("end_date", endDate);

        const res = await apiRequest<EventTypesAnalyticsResponse>(
          `/api/analytics/event-types?${query.toString()}`
        );
        if (isMounted) {
          setData(res);
          if (res.categories && res.categories.length > 0) {
            setSelectedCategory(res.categories[0].category);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load event type analytics");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadEventTypes();
    return () => {
      isMounted = false;
    };
  }, [selectedHotel, datePreset, startDate, endDate]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-slate-100 rounded-2xl border border-slate-200" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
        {error || "Unable to load event type benchmarks."}
      </div>
    );
  }

  const categories = data.categories || [];
  const activeCat = categories.find((c) => c.category === selectedCategory) || categories[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 mb-1.5">
            <Tags className="w-3.5 h-3.5 text-emerald-600" />
            Canonical Event Benchmarks & Like-for-Like Audits
          </div>
          <h2 className="font-serif text-xl font-bold text-slate-900">
            Event-Type Performance & Empirical Baselines
          </h2>
          <p className="text-xs text-slate-500">
            Enforcing the empirical minimum 3-event rule to prevent fabricated comparisons. Banquets are compared exclusively against comparable event categories.
          </p>
        </div>

        {/* Category Selection Tabs */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          {categories.map((cat) => {
            const isSelected = activeCat?.category === cat.category;
            return (
              <button
                key={cat.category}
                onClick={() => setSelectedCategory(cat.category)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs font-bold"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{cat.category}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {cat.event_count} events
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeCat && (
        <div className="space-y-6">
          {/* Active Category Benchmark Summary Card */}
          <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  {activeCat.category} Performance Baseline
                </h3>
                <p className="text-xs text-slate-500">
                  Aggregation of all verified shifts recorded under this canonical classification.
                </p>
              </div>

              {/* Sample Size Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  activeCat.sample_size_adequate
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                }`}
              >
                {activeCat.sample_size_adequate ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Adequate Sample Size (N = {activeCat.event_count} events)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Sample Size Warning (N = {activeCat.event_count}/3 events)</span>
                  </>
                )}
              </div>
            </div>

            {/* Note on baseline */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 leading-relaxed">
              <strong>Audit Note: </strong>
              {activeCat.sample_size_note}
            </div>

            {/* Benchmark KPIs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Category Waste Rate
                </span>
                <span className="text-xl font-serif font-bold text-slate-900 mt-1 block">
                  {activeCat.waste_rate_pct.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500">of food cooked</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Waste / Guest
                </span>
                <span className="text-xl font-serif font-bold text-slate-900 mt-1 block">
                  {activeCat.waste_per_guest_g.toFixed(0)}g
                </span>
                <span className="text-[10px] text-slate-500">per attendee</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Total Guests Served
                </span>
                <span className="text-xl font-serif font-bold text-slate-900 mt-1 block">
                  {activeCat.total_pax.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">across {activeCat.event_count} banquets</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Financial Waste Loss
                </span>
                <span className="text-xl font-serif font-bold text-slate-900 mt-1 block">
                  {formatINR(activeCat.total_waste_cost)}
                </span>
                <span className="text-[10px] text-slate-500">
                  ₹{activeCat.waste_cost_per_guest.toFixed(1)} per guest
                </span>
              </div>
            </div>
          </div>

          {/* Subtypes Breakdown (if any) */}
          {activeCat.subtypes && activeCat.subtypes.length > 0 && (
            <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
              <h4 className="font-serif text-base font-bold text-slate-900">
                Subtype Breakdown ({activeCat.category})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {activeCat.subtypes.map((st) => (
                  <div
                    key={st.subtype}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{st.subtype}</span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {st.record_count} records
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Waste Rate:</span>
                      <strong className="text-slate-900">{st.waste_rate_pct.toFixed(1)}%</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Waste / Guest:</span>
                      <strong className="text-slate-900">{st.waste_per_guest_g.toFixed(0)}g</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Financial Loss:</span>
                      <strong className="text-slate-900">{formatINR(st.waste_cost)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itemized Events in this Category Table */}
          <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
            <h4 className="font-serif text-base font-bold text-slate-900">
              Like-for-Like Event Comparison ({activeCat.category})
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70 font-semibold">
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Hotel</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Guests (Pax)</th>
                    <th className="py-3 px-4 text-right">Cooked (kg)</th>
                    <th className="py-3 px-4 text-right">Waste (kg)</th>
                    <th className="py-3 px-4 text-right">Waste %</th>
                    <th className="py-3 px-4 text-right">Waste / Guest</th>
                    <th className="py-3 px-4 text-right">Loss (₹)</th>
                    <th className="py-3 px-4 text-center">vs Category Benchmark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeCat.events.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{ev.event_name}</div>
                        <div className="text-[11px] text-slate-500">{ev.subtype}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{ev.hotel_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{ev.date}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">{ev.pax}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {formatKg(ev.prepared_kg)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700 font-bold">
                        {formatKg(ev.waste_kg)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {ev.waste_rate_pct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {ev.waste_per_guest_g.toFixed(0)}g
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {formatINR(ev.waste_cost)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ev.compared_to_benchmark !== null ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ev.compared_to_benchmark <= 0
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {ev.compared_to_benchmark > 0 ? "+" : ""}
                            {ev.compared_to_benchmark.toFixed(1)}% pts
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Insufficient Baseline
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
