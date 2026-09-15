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
        <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-slate-900 animate-spin" />
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
      {/* Header Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3.5">
          <Link
            href="/events"
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {event.name}
              </h1>
              <StatusBadge status={event.status} />
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                {event.event_type}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-normal text-slate-500 mt-1.5">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {event.event_date}
              </span>
              {event.venue && (
                <span>• Venue: <strong className="text-slate-800 font-semibold">{event.venue}</strong></span>
              )}
              <span>• Guests: <strong className="text-slate-900 font-bold">{event.actual_guests} actual</strong> ({event.expected_guests} expected)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <select
            value={event.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-slate-400 cursor-pointer shadow-2xs"
          >
            <option value="Upcoming">Status: Upcoming</option>
            <option value="Active">Status: Active</option>
            <option value="Completed">Status: Completed</option>
          </select>

          <Link
            href={`/events/${event.id}/analytics`}
            className="hotel-btn-secondary py-2 text-xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            Analytics
          </Link>

          <Link
            href={`/events/${event.id}/report`}
            className="hotel-btn-secondary py-2 text-xs"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Report
          </Link>

          <button
            onClick={() => setIsFoodModalOpen(true)}
            className="hotel-btn-secondary py-2 text-xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            Add Menu Item
          </button>

          {/* Primary Action Button */}
          <Link
            href={`/events/${event.id}/scan`}
            className="hotel-btn-primary py-2 text-xs"
          >
            <Camera className="w-4 h-4" />
            Scan Waste
          </Link>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="hotel-card p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
            <span>Prepared Quantity</span>
            <Utensils className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatKg(event.total_prepared_kg)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {event.event_foods.length} menu dishes
          </div>
        </div>

        <div className="hotel-card p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
            <span>Est. Food Waste</span>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 tracking-tight">
            {formatKg(event.total_waste_kg)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Measured leftover
          </div>
        </div>

        <div className="hotel-card p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
            <span>Waste Rate %</span>
            <span className="w-2 h-2 rounded-full bg-slate-300" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {event.waste_percentage}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Prepared vs leftover
          </div>
        </div>

        <div className="hotel-card p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
            <span>Est. Waste Cost</span>
            <span className="text-slate-400 font-bold">₹</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatINR(event.total_waste_cost)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            From raw recipes
          </div>
        </div>

        <div className="hotel-card p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
            <span>Waste / Guest</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {event.waste_per_guest_grams} <span className="text-xs font-semibold text-slate-500">g</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Per attendee served
          </div>
        </div>
      </div>

      {/* Menu Management Section */}
      <div className="hotel-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-slate-900">
              Banquet Menu & Portion Yield
            </h2>
            <p className="text-xs text-slate-500 font-normal">Batch preparation weight and camera waste scan records</p>
          </div>
          <button
            onClick={() => setIsFoodModalOpen(true)}
            className="hotel-btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Food Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Food Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Prepared (kg)</th>
                <th className="py-3.5 px-4 text-right">Leftover (kg)</th>
                <th className="py-3.5 px-4 text-right">Loss %</th>
                <th className="py-3.5 px-4 text-right">Rate / kg</th>
                <th className="py-3.5 px-4 text-right">Est. Loss Value</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {event.event_foods.map((food) => {
                return (
                  <tr key={food.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {food.food_item_name}
                      {food.notes && (
                        <p className="text-[11px] font-normal text-slate-400 mt-0.5">{food.notes}</p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {food.food_item_category}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-700">
                      {food.prepared_weight_kg} kg
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-rose-600">
                      {food.net_waste_kg > 0 ? `${food.net_waste_kg} kg` : "—"}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-800">
                      {food.net_waste_kg > 0 ? `${food.waste_percentage}%` : "—"}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-600 font-medium">
                      ₹{food.estimated_cost_per_kg}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900">
                      {food.net_waste_kg > 0 ? formatINR(food.waste_cost) : "—"}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/events/${event.id}/scan`}
                          className="hotel-btn-primary text-[10px] py-1 px-2.5 rounded-md"
                        >
                          <Camera className="w-3 h-3" />
                          Scan
                        </Link>
                        <button
                          onClick={() => handleDeleteFood(food.id)}
                          title="Remove item"
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
                    No menu items added to this banquet yet. Click &quot;Add Food Item&quot; to configure dishes.
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
