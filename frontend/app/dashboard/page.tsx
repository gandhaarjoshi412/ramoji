"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import { DashboardSummary } from "@/types";
import {
  Calendar,
  Camera,
  Plus,
  RefreshCw,
  ArrowRight,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  Scale,
  Users,
  ChevronRight,
  UtensilsCrossed,
  Award,
  Layers,
  ChefHat,
} from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<DashboardSummary>("/api/dashboard/summary");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        fetchDashboard();
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || (loading && !data)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">Loading Culinary Operations...</p>
      </div>
    );
  }

  const maxWasteCost = data?.top_wasted_foods?.[0]?.total_waste_cost || 1;
  const barGradients = [
    "from-rose-500 to-rose-600",
    "from-indigo-500 to-indigo-600",
    "from-amber-500 to-amber-600",
    "from-emerald-500 to-emerald-600",
    "from-cyan-500 to-cyan-600",
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Executive Kitchen & Operations Hero Banner */}
      <div className="rounded-2xl p-7 sm:p-9 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white border border-slate-800/80 shadow-xl relative overflow-hidden">
        {/* Subtle Ambient Emerald Aura */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.14)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              Executive Kitchen & Banquet Operations
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Banquet Food Waste & Yield Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
              Optical volumetric waste estimation and recipe costing engine for{" "}
              <span className="text-emerald-400 font-semibold">{user?.hotel_name || "Dolphin Hotels"}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchDashboard}
              title="Refresh Analytics"
              className="p-2.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/events/new"
              className="hotel-btn-emerald py-2.5 px-4 text-xs font-bold active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Banquet Event
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDashboard} className="underline uppercase tracking-wider font-bold text-rose-900 cursor-pointer">Retry</button>
        </div>
      )}

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Events */}
        <div className="hotel-card p-5 border border-slate-200/80 bg-white flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Banquets
            </span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {data?.total_events || 0}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span>Completed</span>
            <span className="font-bold text-slate-900">{data?.completed_events || 0}</span>
          </div>
        </div>

        {/* AI Photo Scans */}
        <div className="hotel-card p-5 border border-slate-200/80 bg-white flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Dish Scans
            </span>
            <div className="text-3xl font-extrabold text-indigo-600 tracking-tight">
              {data?.total_scans || 0}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100">
            Vision Records
          </div>
        </div>

        {/* Estimated Food Wasted */}
        <div className="hotel-card p-5 border border-slate-200/80 bg-white flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Est. Waste
            </span>
            <div className="text-3xl font-extrabold text-rose-600 tracking-tight">
              {formatKg(data?.total_estimated_waste_kg || 0)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100">
            Measured Volume
          </div>
        </div>

        {/* Estimated Waste Cost Loss */}
        <div className="hotel-card p-5 border border-slate-200/80 bg-white flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Cost Loss
            </span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatINR(data?.total_estimated_waste_cost || 0)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100">
            Raw Recipes Rate
          </div>
        </div>

        {/* Average Waste per Guest */}
        <div className="hotel-card p-5 border border-slate-200/80 bg-white flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Waste / Guest
            </span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {data?.average_waste_per_guest_grams || 0} <span className="text-xs font-semibold text-slate-500">g</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100">
            Per Attendee
          </div>
        </div>

        {/* AI Confidence */}
        <div className="hotel-card p-5 border border-slate-200/80 bg-white flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Accuracy
            </span>
            <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              {data?.average_ai_confidence ? `${data.average_ai_confidence}%` : "—"}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100">
            {data?.human_corrections_count || 0} Staff Audits
          </div>
        </div>
      </div>

      {/* Main Content: Events & Cost Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Banquet Service & Cost Loss */}
        <div className="lg:col-span-2 hotel-card p-6 sm:p-7 space-y-6 bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-slate-900">
                Banquet Event Production Loss
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Recorded waste weight and raw procurement batch loss per banquet
              </p>
            </div>
            <Link
              href="/events"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors uppercase tracking-wider active:scale-95"
            >
              All Events <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {data?.waste_by_event && data.waste_by_event.length > 0 ? (
              data.waste_by_event.map((item) => (
                <div
                  key={item.event_id}
                  className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:border-slate-300 hover:bg-slate-50 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/events/${item.event_id}`}
                        className="font-bold text-slate-900 hover:text-emerald-700 transition-colors text-base"
                      >
                        {item.event_name}
                      </Link>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                        {item.event_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600">
                        Waste: <strong className="text-rose-600 font-bold">{item.total_waste_kg} kg</strong>
                      </span>
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                        Loss: {formatINR(item.total_waste_cost)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/50">
                    <span>Date: <strong className="text-slate-700">{item.event_date}</strong></span>
                    <span>Guests: <strong className="text-slate-700">{item.actual_guests}</strong></span>
                    <span>Scans: <strong className="text-slate-700">{item.scans_count}</strong></span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/events/${item.event_id}`}
                        className="hotel-btn-secondary text-[10px] py-1 px-2.5 rounded-md active:scale-95"
                      >
                        View Menu
                      </Link>
                      <Link
                        href={`/events/${item.event_id}/scan`}
                        className="hotel-btn-primary text-[10px] py-1 px-2.5 rounded-md active:scale-95"
                      >
                        <Camera className="w-3 h-3 text-emerald-400" />
                        Scan Dish
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                No active banquet waste records found. Create an event or record a scan to begin analysis.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Top Wasted Foods & Registry */}
        <div className="space-y-6">
          {/* Top Wasted Foods Card */}
          <div className="hotel-card p-6 space-y-4 bg-white border border-slate-200/80 shadow-card">
            <h3 className="font-serif text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Top Kitchen Waste Items</span>
              <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
            </h3>
            {data?.top_wasted_foods && data.top_wasted_foods.length > 0 ? (
              <div className="space-y-4">
                {data.top_wasted_foods.map((food, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800 font-bold">{food.food_name}</span>
                      <span className="text-rose-600 font-mono font-bold">{formatINR(food.total_waste_cost)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barGradients[idx % barGradients.length]} transition-all duration-500`}
                        style={{
                          width: `${Math.max(8, (food.total_waste_cost / maxWasteCost) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{food.category || "Hot Buffet"}</span>
                      <span className="font-semibold text-slate-600">{formatKg(food.total_waste_kg)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No food waste data recorded yet.</p>
            )}
          </div>

          {/* Culinary Registry Links */}
          <div className="hotel-card p-6 space-y-3 bg-white border border-slate-200/80 shadow-card">
            <h3 className="font-serif text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
              Culinary Registry
            </h3>
            <div className="space-y-2">
              <Link
                href="/events"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-all text-xs font-bold text-slate-800 active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  <span>Banquet Event Registry</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                href="/recipes"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-all text-xs font-bold text-slate-800 active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Recipe & Yield Master</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                href="/ingredients"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-all text-xs font-bold text-slate-800 active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span>Ingredient Procurement Rates</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
