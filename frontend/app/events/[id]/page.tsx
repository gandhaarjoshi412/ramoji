"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import { EventDetail, EventFood } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { RecordWasteModal } from "@/components/RecordWasteModal";
import { AddFoodModal } from "@/components/AddFoodModal";
import {
  ArrowLeft,
  Calendar,
  Users,
  Utensils,
  Trash2,
  DollarSign,
  TrendingDown,
  Camera,
  PlusCircle,
  FileText,
  Clock,
  Sparkles,
  BarChart3,
  Trash,
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
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
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
    if (!confirm("Are you sure you want to remove this food item?")) {
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="text-sm text-slate-500 font-medium">Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-red-50 text-red-700 font-medium">
          {error || "Event not found."}
        </div>
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Return to Events List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3">
          <Link
            href="/events"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {event.name}
              </h1>
              <StatusBadge status={event.status} />
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {event.event_type}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 mt-1.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {event.event_date}
              </span>
              {event.venue && (
                <span>• Venue: <strong className="text-slate-700">{event.venue}</strong></span>
              )}
              <span>• Guests: <strong className="text-slate-800">{event.actual_guests} actual</strong> ({event.expected_guests} expected)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Status Changer */}
          <select
            value={event.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          >
            <option value="Upcoming">Status: Upcoming</option>
            <option value="Active">Status: Active</option>
            <option value="Completed">Status: Completed</option>
          </select>

          <Link
            href={`/events/${event.id}/analytics`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            AI Analytics
          </Link>

          <Link
            href={`/events/${event.id}/report`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            Print Report
          </Link>

          <button
            onClick={() => setIsFoodModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
            Add Menu Item
          </button>

          {/* Primary Action: Open AI Camera Scanner */}
          <Link
            href={`/events/${event.id}/scan`}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            Scan Food Waste
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
            <span>Prepared Quantity</span>
            <Utensils className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatKg(event.total_prepared_kg)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            {event.event_foods.length} menu items
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
            <span>Est. Food Waste</span>
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600">
            {formatKg(event.total_waste_kg)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Camera-estimated
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
            <span>Waste Rate %</span>
            <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {event.waste_percentage}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Prepared vs leftover
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
            <span>Est. Waste Cost</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatINR(event.total_waste_cost)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            From recipe costs
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
            <span>Waste / Guest</span>
            <Users className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {event.waste_per_guest_grams} <span className="text-sm font-bold">g</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Per actual attendee
          </div>
        </div>
      </div>

      {/* Menu Management Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Event Menu Items</h2>
            <p className="text-xs text-slate-500">Track batch preparation quantities and scan dishes after service</p>
          </div>
          <button
            onClick={() => setIsFoodModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 self-start sm:self-auto"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
            Add Food Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-6">Food Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Prepared (kg)</th>
                <th className="py-3 px-4 text-right">Leftover (kg)</th>
                <th className="py-3 px-4 text-right">Waste %</th>
                <th className="py-3 px-4 text-right">Cost/kg (INR)</th>
                <th className="py-3 px-4 text-right">Est. Waste Value (INR)</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {event.event_foods.map((food) => {
                return (
                  <tr key={food.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {food.food_item_name}
                      {food.notes && (
                        <p className="text-[11px] font-normal text-slate-400">{food.notes}</p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {food.food_item_category}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-slate-700">
                      {food.prepared_weight_kg} kg
                    </td>
                    <td className="py-4 px-4 text-right font-black text-red-600">
                      {food.net_waste_kg > 0 ? `${food.net_waste_kg} kg` : "—"}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-800">
                      {food.net_waste_kg > 0 ? `${food.waste_percentage}%` : "—"}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-600 font-medium">
                      ₹{food.estimated_cost_per_kg}
                    </td>
                    <td className="py-4 px-4 text-right font-black text-slate-900">
                      {food.net_waste_kg > 0 ? formatINR(food.waste_cost) : "—"}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/events/${event.id}/scan`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Scan Dish
                        </Link>
                        <button
                          onClick={() => handleDeleteFood(food.id)}
                          title="Remove item"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No menu items added to this banquet yet. Click "Add Food Item" above to get started.
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
