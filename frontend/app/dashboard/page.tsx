"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import { DashboardSummary } from "@/types";
import {
  Sparkles,
  Calendar,
  Camera,
  Trash2,
  DollarSign,
  Users,
  PlusCircle,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  CheckCircle2,
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="text-sm text-slate-500 font-medium">Loading AI food waste analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            AI Food Waste & Cost Analytics
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Computer-vision detection, camera quantity estimation & recipe ingredient costing for <span className="font-semibold text-slate-800">{user?.hotel_name || "Dolphin Hotels"}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="p-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
            title="Refresh analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-md hover:bg-emerald-700 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Create Banquet Event
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Events */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Banquet Events</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data?.total_events || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            <span className="text-emerald-700 font-bold">{data?.completed_events || 0}</span> completed
          </div>
        </div>

        {/* Total Scans */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">AI Photo Scans</span>
            <Camera className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data?.total_scans || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            YOLO26-seg logs
          </div>
        </div>

        {/* Estimated Food Wasted */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Est. Food Waste</span>
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600">
            {formatKg(data?.total_estimated_waste_kg || 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Volume approximation
          </div>
        </div>

        {/* Estimated Waste Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Est. Waste Loss</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatINR(data?.total_estimated_waste_cost || 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            From ingredient costs
          </div>
        </div>

        {/* Average Waste per Guest */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Waste / Guest</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data?.average_waste_per_guest_grams || 0} <span className="text-sm font-semibold">g</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Per attendee served
          </div>
        </div>

        {/* AI Confidence */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">AI Confidence</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data?.average_ai_confidence || 0}%
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {data?.human_corrections_count || 0} verified edits
          </div>
        </div>
      </div>

      {/* Event Breakdown and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waste by Event */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Event Waste & Production Loss</h2>
              <p className="text-xs text-slate-500">Estimated food volume and recipe ingredient costs per banquet</p>
            </div>
            <Link
              href="/events"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              All Events <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {data?.waste_by_event.map((item) => (
              <div key={item.event_id} className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Link href={`/events/${item.event_id}/analytics`} className="hover:underline hover:text-emerald-700">
                      {item.event_name}
                    </Link>
                    <span className="text-[11px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {item.event_type}
                    </span>
                  </div>
                  <div className="font-black text-red-600 text-sm">
                    {item.total_waste_kg} kg
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                  <span>Date: <strong>{item.event_date}</strong></span>
                  <span>Guests: <strong>{item.actual_guests}</strong></span>
                  <span>Photo Scans: <strong>{item.scans_count}</strong></span>
                  <span className="font-bold text-slate-900">
                    Est. Loss: <strong>{formatINR(item.total_waste_cost)}</strong>
                  </span>
                </div>
              </div>
            ))}

            {(!data?.waste_by_event || data.waste_by_event.length === 0) && (
              <div className="text-center py-10 text-slate-400 text-sm">
                No banquet events recorded yet. Click "Create Banquet Event" to begin.
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Model Overview */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">AI Model Architecture</h2>
            <p className="text-xs text-slate-500">Camera-only detection & recipe pricing</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Model Pipeline</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">YOLO26-seg + Quantity Estimator</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Measurement Method</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">Camera 2D Area × Depth × Density</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Cost Calculation</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">Ingredient Recipe Batch Yields</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/settings"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Configure AI Settings & Export Data
            </Link>
          </div>
        </div>
      </div>

      {/* Top Wasted Foods Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Top Wasted Food Items</h2>
            <p className="text-xs text-slate-500">Dishes causing the highest accumulated estimated waste loss</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Ranked by Estimated Loss (INR)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-6">Food Item</th>
                <th className="py-3 px-6">Category</th>
                <th className="py-3 px-6 text-center">AI Scans Logged</th>
                <th className="py-3 px-6 text-right">Total Est. Waste (kg)</th>
                <th className="py-3 px-6 text-right">Total Production Loss (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.top_wasted_foods.map((food, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-slate-900">
                    {food.food_name}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {food.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-center text-xs font-semibold text-slate-600">
                    {food.scans_count}
                  </td>
                  <td className="py-3.5 px-6 text-right font-black text-red-600">
                    {food.total_waste_kg} kg
                  </td>
                  <td className="py-3.5 px-6 text-right font-black text-slate-900">
                    {formatINR(food.total_waste_cost)}
                  </td>
                </tr>
              ))}

              {(!data?.top_wasted_foods || data.top_wasted_foods.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No food waste recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
