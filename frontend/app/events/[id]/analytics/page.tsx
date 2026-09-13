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
  Sparkles,
  Users,
  Utensils,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  FileText,
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="text-sm text-slate-500 font-medium">Aggregating AI event waste analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-red-50 text-red-700 font-medium">
          {error || "Event analytics not available."}
        </div>
        <Link href={`/events/${eventId}`} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Return to Event
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}`}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {data.event_name}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {data.event_type}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {data.event_date} • Guests: <strong className="text-slate-800">{data.actual_guests} actual</strong> ({data.expected_guests} expected)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Summary
          </button>

          <Link
            href={`/events/${eventId}/scan`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            Scan Waste
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Total AI Scans</span>
          <div className="text-2xl font-black text-slate-900">{data.total_scans_count}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Logged photos</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Est. Waste (kg)</span>
          <div className="text-2xl font-black text-red-600">{data.total_estimated_waste_kg} kg</div>
          <span className="text-[11px] text-slate-400 mt-1 block">({data.total_estimated_waste_grams.toLocaleString()} g)</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Est. Waste Loss</span>
          <div className="text-2xl font-black text-slate-900">{formatINR(data.total_estimated_waste_cost)}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">From ingredient recipes</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Waste / Guest</span>
          <div className="text-2xl font-black text-slate-900">{data.waste_per_guest_grams} <span className="text-sm font-bold text-slate-500">g</span></div>
          <span className="text-[11px] text-slate-400 mt-1 block">Per actual attendee</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500 block mb-1">AI Confidence</span>
          <div className="text-2xl font-black text-emerald-700">{data.average_ai_confidence}%</div>
          <span className="text-[11px] text-slate-400 mt-1 block">{data.human_corrections_count} human edits</span>
        </div>
      </div>

      {/* Food Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Food-by-Food Waste Breakdown</h2>
            <p className="text-xs text-slate-500">Camera-estimated volume and recipe cost calculations</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {data.food_breakdown.length} Dishes Scanned
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-6">Food Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Photo Scans</th>
                <th className="py-3 px-4 text-right">Est. Waste (kg)</th>
                <th className="py-3 px-4 text-right">Est. Waste (g)</th>
                <th className="py-3 px-6 text-right">Est. Production Loss (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.food_breakdown.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-bold text-slate-900">{item.food_name}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-700">
                    {item.scans_count}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-red-600">
                    {item.total_waste_kg} kg
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                    {item.total_waste_grams.toLocaleString()} g
                  </td>
                  <td className="py-3.5 px-6 text-right font-black text-slate-900">
                    {formatINR(item.total_waste_cost)}
                  </td>
                </tr>
              ))}

              {data.food_breakdown.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No food waste scans recorded for this event yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scans Gallery with AI Predictions vs Corrections */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Recorded Photo Scans & AI Auditing</h2>
          <p className="text-xs text-slate-500">Visual proof, AI prediction confidence, and staff verification records</p>
        </div>

        <div className="divide-y divide-slate-100">
          {data.scans.map((scan) => (
            <div key={scan.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                  <img src={scan.image_url} alt={scan.final_food_name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{scan.final_food_name}</span>
                    {scan.human_food_correction && (
                      <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.2 rounded border border-purple-200">
                        Staff Corrected (AI predicted {scan.ai_food_prediction})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>Confidence: <strong>{Math.round(scan.ai_confidence * 100)}%</strong></span>
                    <span>•</span>
                    <span>Model: <strong>{scan.ai_model_name}</strong></span>
                    <span>•</span>
                    <span>{new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {scan.notes && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">"{scan.notes}"</p>
                  )}
                </div>
              </div>

              <div className="text-right sm:self-center shrink-0">
                <div className="text-base font-black text-slate-900">
                  {scan.final_weight_grams} g
                </div>
                <div className="text-xs font-bold text-red-600">
                  {formatINR(scan.final_waste_cost)}
                </div>
                <div className="text-[10px] text-slate-400">
                  (₹{scan.cost_per_gram.toFixed(3)}/g)
                </div>
              </div>
            </div>
          ))}

          {data.scans.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">
              No photo scans recorded yet. Click "Scan Waste" above to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
