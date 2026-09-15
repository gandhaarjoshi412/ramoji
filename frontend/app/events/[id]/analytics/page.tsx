"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import { EventAnalytics, WasteScan } from "@/types";
import {
  ArrowLeft,
  Camera,
  Printer,
  PieChart,
  ChevronRight,
} from "lucide-react";

export default function EventAnalyticsPage() {
  const params = useParams();
  const eventId = Number(params?.id);
  const router = useRouter();
  const { user } = useAuth();

  const [data, setData] = useState<EventAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      setLoading(true);
      apiRequest<EventAnalytics>(`/api/events/${eventId}/analytics`)
        .then((res) => setData(res))
        .catch((err) => setError(err.message || "Failed to load event analytics"))
        .finally(() => setLoading(false));
    }
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-[#0f2942] animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aggregating Vision Analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error || "Event analytics not available."}
        </div>
        <Link href={`/events/${eventId}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-900 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Return to Event
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          <Link
            href={`/events/${eventId}`}
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {data.event_name}
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                {data.event_type}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-1">
              Date: <strong className="text-slate-800 font-semibold">{data.event_date}</strong> • Guests: <strong className="text-slate-900 font-bold">{data.actual_guests} actual</strong> ({data.expected_guests} expected)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="hotel-btn-secondary text-xs py-2"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Summary
          </button>

          <Link
            href={`/events/${eventId}/scan`}
            className="hotel-btn-gold text-xs py-2"
          >
            <Camera className="w-4 h-4" />
            Scan Leftover Dish
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="hotel-card p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Scans</span>
          <div className="text-2xl font-bold text-slate-900">{data.total_scans_count}</div>
          <span className="text-[11px] text-slate-400 font-normal mt-1 block">Logged photographs</span>
        </div>

        <div className="hotel-card p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Est. Waste</span>
          <div className="text-2xl font-bold text-[#881337]">{data.total_estimated_waste_kg} kg</div>
          <span className="text-[11px] text-slate-400 font-normal mt-1 block">({data.total_estimated_waste_grams.toLocaleString()} g)</span>
        </div>

        <div className="hotel-card p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Production Loss</span>
          <div className="text-2xl font-bold text-[#c2410c]">{formatINR(data.total_estimated_waste_cost)}</div>
          <span className="text-[11px] text-slate-400 font-normal mt-1 block">From raw recipes</span>
        </div>

        <div className="hotel-card p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Waste / Guest</span>
          <div className="text-2xl font-bold text-slate-900">{data.waste_per_guest_grams} <span className="text-xs font-normal text-slate-500">g</span></div>
          <span className="text-[11px] text-slate-400 font-normal mt-1 block">Per attendee served</span>
        </div>

        <div className="hotel-card p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">AI Accuracy</span>
          <div className="text-2xl font-bold text-[#064e3b]">{data.average_ai_confidence}%</div>
          <span className="text-[11px] text-slate-400 font-normal mt-1 block">{data.human_corrections_count} verified edits</span>
        </div>
      </div>

      {/* Food Breakdown Table */}
      <div className="hotel-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#b48324]" />
              Dish Leftover Breakdown
            </h2>
            <p className="text-xs text-slate-500 font-normal">Camera estimated volume and ingredient batch cost calculations</p>
          </div>
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
            {data.food_breakdown.length} Dishes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Food Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-center">Scans</th>
                <th className="py-3.5 px-4 text-right">Est. Waste (kg)</th>
                <th className="py-3.5 px-4 text-right">Est. Weight (g)</th>
                <th className="py-3.5 px-6 text-right">Cost Loss (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.food_breakdown.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">{item.food_name}</td>
                  <td className="py-4 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-xs font-bold text-slate-700">
                    {item.scans_count}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-[#881337]">
                    {item.total_waste_kg} kg
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-slate-800">
                    {item.total_waste_grams.toLocaleString()} g
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-slate-900">
                    {formatINR(item.total_waste_cost)}
                  </td>
                </tr>
              ))}

              {data.food_breakdown.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-normal">
                    No food waste scans recorded for this event yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scans Gallery with AI Predictions vs Corrections */}
      <div className="hotel-card overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#b48324]" />
            Visual Proof & Camera Audit Logs
          </h2>
          <p className="text-xs text-slate-500 font-normal">Visual proof of leftovers, optical confidence ratings, and staff verifications</p>
        </div>

        <div className="divide-y divide-slate-100">
          {data.scans.map((scan) => (
            <div key={scan.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 shadow-2xs relative">
                  <img src={scan.image_url} alt={scan.final_food_name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                    <span>{scan.final_food_name}</span>
                    {scan.human_food_correction && (
                      <span className="text-[10px] font-bold bg-amber-50 text-[#966814] px-2 py-0.5 rounded-md border border-amber-200">
                        Staff Overridden (AI: {scan.ai_food_prediction})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-normal mt-1 flex items-center gap-3 flex-wrap">
                    <span>AI Confidence: <strong className="text-slate-800">{Math.round(scan.ai_confidence * 100)}%</strong></span>
                    <span>•</span>
                    <span>Model: <strong className="text-slate-800">{scan.ai_model_name}</strong></span>
                    <span>•</span>
                    <span>{new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {scan.notes && (
                    <p className="text-[11px] text-slate-500 mt-1 italic font-normal">&quot;{scan.notes}&quot;</p>
                  )}
                </div>
              </div>

              <div className="text-right sm:self-center shrink-0">
                <div className="text-base font-bold text-slate-900">
                  {scan.final_weight_grams} g
                </div>
                <div className="text-xs font-bold text-[#881337]">
                  {formatINR(scan.final_waste_cost)}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  (₹{scan.cost_per_gram.toFixed(3)}/g)
                </div>
              </div>
            </div>
          ))}

          {data.scans.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs font-normal">
              No photo scans recorded yet. Click &quot;Scan Leftover Dish&quot; to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
