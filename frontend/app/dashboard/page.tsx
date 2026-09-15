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
  DollarSign,
  Users,
  ChevronRight,
  UtensilsCrossed,
  Award,
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
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#b48324] rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">Loading Culinary Operations...</p>
      </div>
    );
  }

  const maxWasteCost = data?.top_wasted_foods?.[0]?.total_waste_cost || 1;
  const barColors = ["bg-[#b48324]", "bg-[#0f2942]", "bg-[#881337]", "bg-[#064e3b]", "bg-[#4c1d95]"];

  return (
    <div className="space-y-8 pb-16">
      {/* 5-Star Hotel Executive Header Card */}
      <div className="rounded-2xl p-7 sm:p-9 bg-gradient-to-br from-[#0c131f] via-[#111c2e] to-[#0c131f] text-white border border-slate-800/80 shadow-xl relative overflow-hidden">
        {/* Subtle Warm Luxury Amber Ambient Highlight */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_center,rgba(180,131,36,0.12)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#b48324]/20 text-[#f4d89a] border border-[#b48324]/35">
              <Award className="w-3.5 h-3.5 text-[#e5b958]" />
              Executive Kitchen & Banquet Operations
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Banquet Food Waste & Yield Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
              Camera-based optical volume estimation and raw ingredient recipe costing for{" "}
              <span className="text-[#f4d89a] font-semibold">{user?.hotel_name || "Dolphin Hotels"}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchDashboard}
              title="Refresh Analytics"
              className="p-2.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/events/new"
              className="hotel-btn-gold"
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

      {/* KPI Metric Cards Grid with Bespoke Hotel Color Borders */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Events */}
        <div className="hotel-card p-5 border-t-3 border-t-[#0f2942] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Banquets
            </span>
            <div className="text-3xl font-extrabold text-[#0f2942]">
              {data?.total_events || 0}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span>Completed</span>
            <span className="font-bold text-slate-900">{data?.completed_events || 0}</span>
          </div>
        </div>

        {/* AI Photo Scans */}
        <div className="hotel-card p-5 border-t-3 border-t-[#b48324] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Dish Scans
            </span>
            <div className="text-3xl font-extrabold text-[#966814]">
              {data?.total_scans || 0}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100">
            Vision Records
          </div>
        </div>

        {/* Estimated Food Wasted */}
        <div className="hotel-card p-5 border-t-3 border-t-[#881337] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Est. Waste
            </span>
            <div className="text-3xl font-extrabold text-[#881337]">
              {formatKg(data?.total_estimated_waste_kg || 0)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100">
            Measured Volume
          </div>
        </div>

        {/* Estimated Waste Cost Loss */}
        <div className="hotel-card p-5 border-t-3 border-t-[#c2410c] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Cost Loss
            </span>
            <div className="text-3xl font-extrabold text-[#c2410c]">
              {formatINR(data?.total_estimated_waste_cost || 0)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100">
            Raw Ingredient Rate
          </div>
        </div>

        {/* Average Waste per Guest */}
        <div className="hotel-card p-5 border-t-3 border-t-[#4c1d95] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Waste / Guest
            </span>
            <div className="text-3xl font-extrabold text-[#4c1d95]">
              {data?.average_waste_per_guest_grams || 0} <span className="text-xs font-semibold text-slate-500">g</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100">
            Per Attendee
          </div>
        </div>

        {/* AI Confidence */}
        <div className="hotel-card p-5 border-t-3 border-t-[#064e3b] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Accuracy
            </span>
            <div className="text-3xl font-extrabold text-[#064e3b]">
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
        <div className="lg:col-span-2 hotel-card p-6 sm:p-7 space-y-6">
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
              className="text-xs font-bold text-[#b48324] hover:text-[#966814] flex items-center gap-1 transition-colors uppercase tracking-wider"
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
                        className="font-bold text-slate-900 hover:text-slate-700 transition-colors text-base"
                      >
                        {item.event_name}
                      </Link>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f2942] bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
                        {item.event_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600">
                        Waste: <strong className="text-[#881337] font-bold">{item.total_waste_kg} kg</strong>
                      </span>
                      <span className="text-xs font-bold text-[#c2410c] bg-amber-50/70 border border-amber-200/80 px-2.5 py-1 rounded-md">
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
                        className="hotel-btn-secondary text-[10px] py-1 px-2.5 rounded-md"
                      >
                        View Menu
                      </Link>
                      <Link
                        href={`/events/${item.event_id}/scan`}
                        className="hotel-btn-primary text-[10px] py-1 px-2.5 rounded-md"
                      >
                        <Camera className="w-3 h-3" />
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

        {/* Right Column: AI Model Info & Top Wasted Foods */}
        <div className="space-y-6">
          {/* Top Wasted Foods Card */}
          <div className="hotel-card p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Top Kitchen Waste Items</span>
              <UtensilsCrossed className="w-4 h-4 text-[#b48324]" />
            </h3>
            {data?.top_wasted_foods && data.top_wasted_foods.length > 0 ? (
              <div className="space-y-3.5">
                {data.top_wasted_foods.map((food, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800">{food.food_name}</span>
                      <span className="text-[#881337] font-bold">{formatINR(food.total_waste_cost)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColors[idx % barColors.length]}`}
                        style={{
                          width: `${Math.max(8, (food.total_waste_cost / maxWasteCost) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{food.category || "Hot Buffet"}</span>
                      <span>{formatKg(food.total_waste_kg)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No food waste data recorded yet.</p>
            )}
          </div>

          {/* Quick Operations Links */}
          <div className="hotel-card p-6 space-y-3">
            <h3 className="font-serif text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
              Culinary Registry
            </h3>
            <div className="space-y-2">
              <Link
                href="/events"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors text-xs font-bold text-slate-800"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#0f2942]" />
                  <span>Banquet Event Registry</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                href="/recipes"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors text-xs font-bold text-slate-800"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#b48324]" />
                  <span>Recipe & Yield Master</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                href="/ingredients"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors text-xs font-bold text-slate-800"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#064e3b]" />
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
