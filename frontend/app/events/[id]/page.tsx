"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import { EventDetail, EventFood } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { AddFoodModal } from "@/components/AddFoodModal";
import {
  ArrowLeft,
  Calendar,
  Users,
  Utensils,
  Trash2,
  Camera,
  Plus,
  FileText,
  BarChart3,
  Trash,
  ChevronRight,
  TrendingDown,
  Building2,
  Sparkles,
} from "lucide-react";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = Number(params?.id);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);

  const fetchEventDetail = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<EventDetail>(`/api/events/${eventId}`);
      setEvent(res);
    } catch (err: any) {
      setError(err.message || "Failed to load banquet event details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        fetchEventDetail();
      }
    }
  }, [eventId, user, authLoading]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiRequest(`/api/events/${eventId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchEventDetail();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleDeleteFood = async (foodId: number) => {
    if (!confirm("Are you sure you want to remove this food item from the banquet menu?")) {
      return;
    }
    try {
      await apiRequest(`/api/events/${eventId}/foods/${foodId}`, {
        method: "DELETE",
      });
      fetchEventDetail();
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  if (authLoading || (loading && !event)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-emerald-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading Banquet Profile...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error || "Event not found."}
        </div>
        <Link href="/events" className="inline-flex items-center gap-2 text-xs font-bold text-slate-900 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Return to Events List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Executive Header Banner Card */}
      <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white border border-slate-800/80 shadow-xl relative overflow-hidden">
        {/* Ambient Emerald Highlight */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/events"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all active:scale-95"
                title="Back to Banquets"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <StatusBadge status={event.status} />
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/15 uppercase tracking-wider">
                {event.event_type}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
              {event.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-normal text-slate-300">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                {event.event_date}
              </span>
              {event.venue && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Venue: <strong className="text-white font-semibold">{event.venue}</strong>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Attendance: <strong className="text-white font-bold">{event.actual_guests} served</strong> ({event.expected_guests} planned)
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
            <select
              value={event.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-bold px-3.5 py-2.5 rounded-xl border border-white/20 bg-slate-900/90 text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer shadow-md"
            >
              <option value="Upcoming">Status: Upcoming</option>
              <option value="Active">Status: Active</option>
              <option value="Completed">Status: Completed</option>
            </select>

            <Link
              href={`/events/${event.id}/analytics`}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              Analytics
            </Link>

            <Link
              href={`/events/${event.id}/report`}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-slate-300" />
              Audit Report
            </Link>

            <button
              onClick={() => setIsFoodModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-300" />
              Add Menu Dish
            </button>

            {/* Primary Action Button */}
            <Link
              href={`/events/${event.id}/scan`}
              className="hotel-btn-emerald py-2.5 px-4 text-xs font-bold shadow-[0_0_16px_rgba(16,185,129,0.3)] active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Scan Waste
            </Link>
          </div>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Prepared Quantity */}
        <div className="hotel-card p-5 bg-white border border-slate-200/80 flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Prepared Quantity</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <Utensils className="w-3.5 h-3.5 text-slate-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {formatKg(event.total_prepared_kg)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              {event.event_foods.length} menu items configured
            </div>
          </div>
        </div>

        {/* Measured Leftover */}
        <div className="hotel-card p-5 bg-white border border-slate-200/80 flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Measured Leftover</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-rose-600 tracking-tight">
              {formatKg(event.total_waste_kg)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Volumetric food waste
            </div>
          </div>
        </div>

        {/* Waste Rate % */}
        <div className="hotel-card p-5 bg-white border border-slate-200/80 flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Waste Rate %</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {event.waste_percentage}%
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  event.waste_percentage > 20 ? "bg-rose-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(event.waste_percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Est. Waste Cost */}
        <div className="hotel-card p-5 bg-white border border-slate-200/80 flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Est. Waste Cost</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <span className="text-xs font-bold text-emerald-700">₹</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {formatINR(event.total_waste_cost)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Calculated from raw recipes
            </div>
          </div>
        </div>

        {/* Waste / Guest */}
        <div className="hotel-card p-5 bg-white border border-slate-200/80 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Waste / Guest</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {event.waste_per_guest_grams} <span className="text-xs font-semibold text-slate-500">g</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Per attendee served
            </div>
          </div>
        </div>
      </div>

      {/* Menu Management Section */}
      <div className="hotel-card overflow-hidden bg-white border border-slate-200/80 shadow-card">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
              Banquet Menu & Yield Performance
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Batch preparation weight, measured leftover scans, and kitchen cost variance
            </p>
          </div>
          <button
            onClick={() => setIsFoodModalOpen(true)}
            className="hotel-btn-secondary text-xs self-start sm:self-auto active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            Add Food Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Food Dish</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Prepared (kg)</th>
                <th className="py-3.5 px-4 text-right">Leftover (kg)</th>
                <th className="py-3.5 px-4 text-right">Loss Rate %</th>
                <th className="py-3.5 px-4 text-right">Cost / kg</th>
                <th className="py-3.5 px-4 text-right">Est. Loss Value</th>
                <th className="py-3.5 px-6 text-right">Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {event.event_foods.map((food) => {
                const hasWaste = food.net_waste_kg > 0;
                return (
                  <tr key={food.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="font-semibold text-slate-900">{food.food_item_name}</div>
                      {food.notes && (
                        <p className="text-[11px] font-normal text-slate-400 mt-0.5">{food.notes}</p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {food.food_item_category}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-700">
                      {food.prepared_weight_kg} kg
                    </td>
                    <td className="py-4 px-4 text-right font-bold">
                      {hasWaste ? (
                        <span className="text-rose-600">{food.net_waste_kg} kg</span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-bold">
                      {hasWaste ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                            food.waste_percentage > 25
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {food.waste_percentage}%
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-600 font-medium font-mono text-xs">
                      ₹{food.estimated_cost_per_kg}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900">
                      {hasWaste ? (
                        <span className="text-rose-700 font-semibold">{formatINR(food.waste_cost)}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/events/${event.id}/scan`}
                          className="hotel-btn-primary text-[10px] py-1.5 px-3 rounded-lg active:scale-95"
                          title="Scan leftover for this dish"
                        >
                          <Camera className="w-3 h-3 text-emerald-400" />
                          Scan
                        </Link>
                        <button
                          onClick={() => handleDeleteFood(food.id)}
                          title="Remove item"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer active:scale-95"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {event.event_foods.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-medium">
                    No menu items configured for this banquet yet. Tap &quot;Add Food Item&quot; to configure dishes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Food Modal */}
      <AddFoodModal
        isOpen={isFoodModalOpen}
        onClose={() => setIsFoodModalOpen(false)}
        eventId={event.id}
        onSuccess={fetchEventDetail}
      />
    </div>
  );
}
