"use client";

import React, { useEffect, useState } from "react";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  X,
  Building2,
  Users,
  UtensilsCrossed,
  ArrowRight,
  RotateCcw,
  BarChart3,
  PieChart,
  Printer,
  ExternalLink,
  Sparkles,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react";

interface EventItem {
  id: number;
  hotel_id: number;
  hotel_name?: string;
  name: string;
  event_type: string;
  event_subtype?: string;
  client_name?: string;
  venue?: string;
  service_format?: string;
  event_date: string;
  expected_guests: number;
  actual_guests: number;
  status: string;
  is_archived?: boolean;
  notes?: string;
  total_prepared_kg: number;
  total_consumed_kg: number;
  total_leftover_kg: number;
  total_reuse_kg: number;
  total_waste_kg: number;
  waste_percentage: number;
  total_waste_cost: number;
  waste_per_guest_grams: number;
  food_items_count: number;
  data_completeness_pct: number;
}

interface DeleteImpact {
  event_id: number;
  event_name: string;
  hotel_name: string;
  event_date: string;
  food_items_count: number;
  waste_scans_count: number;
  analytics_records_count: number;
  message: string;
}

interface EventsSubtabProps {
  selectedHotel: string;
  onSelectEvent?: (eventId: string) => void;
}

export const EventsSubtab: React.FC<EventsSubtabProps> = ({
  selectedHotel,
  onSelectEvent,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalEvent, setDeleteModalEvent] = useState<EventItem | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null);
  const [loadingDeleteImpact, setLoadingDeleteImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Event Deep-Dive Detail Inspection Modal
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<EventItem | null>(null);
  const [detailFullData, setDetailFullData] = useState<any | null>(null);
  const [loadingDetailFull, setLoadingDetailFull] = useState(false);

  // Create Event Form state
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [hotelId, setHotelId] = useState(1);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [eventType, setEventType] = useState("Corporate");
  const [eventSubtype, setEventSubtype] = useState("Annual Conference");
  const [clientName, setClientName] = useState("");
  const [serviceFormat, setServiceFormat] = useState("Buffet");
  const [venue, setVenue] = useState("Grand Ballroom");
  const [expectedPax, setExpectedPax] = useState(150);
  const [actualPax, setActualPax] = useState(140);
  const [notes, setNotes] = useState("");

  // Dishes state in Create Event
  const [dishes, setDishes] = useState<
    {
      dish_name: string;
      session: string;
      category: string;
      prepared_kg: number;
      consumed_kg: number;
      leftover_kg: number;
      reuse_kg: number;
      waste_kg: number;
      waste_cost: number;
      item_cost: number;
    }[]
  >([
    {
      dish_name: "Paneer Butter Masala",
      session: "Lunch",
      category: "Main Course",
      prepared_kg: 25.0,
      consumed_kg: 21.0,
      leftover_kg: 4.0,
      reuse_kg: 2.0,
      waste_kg: 2.0,
      waste_cost: 480.0,
      item_cost: 240.0,
    },
    {
      dish_name: "Jeera Rice",
      session: "Lunch",
      category: "Rice",
      prepared_kg: 30.0,
      consumed_kg: 26.5,
      leftover_kg: 3.5,
      reuse_kg: 1.5,
      waste_kg: 2.0,
      waste_cost: 220.0,
      item_cost: 110.0,
    },
  ]);

  const [savingEvent, setSavingEvent] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (selectedHotel && selectedHotel !== "all") query.set("hotel", selectedHotel);
      if (showArchived) query.set("include_archived", "true");
      if (filterType !== "all") query.set("event_type", filterType);

      const res = await apiRequest<EventItem[]>(`/api/events?${query.toString()}`);
      setEvents(res);
    } catch (err: any) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedHotel, showArchived, filterType]);

  const handleOpenDelete = async (ev: EventItem) => {
    setDeleteModalEvent(ev);
    setLoadingDeleteImpact(true);
    setDeleteImpact(null);
    try {
      const impact = await apiRequest<DeleteImpact>(`/api/events/${ev.id}/delete-impact`);
      setDeleteImpact(impact);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDeleteImpact(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalEvent) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/events/${deleteModalEvent.id}`, { method: "DELETE" });
      setDeleteModalEvent(null);
      fetchEvents();
    } catch (err: any) {
      alert("Failed to delete event: " + (err.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const handleRestoreEvent = async (evId: number) => {
    try {
      await apiRequest(`/api/events/${evId}/restore`, { method: "POST" });
      fetchEvents();
    } catch (err: any) {
      alert("Failed to restore event: " + err.message);
    }
  };

  // Add Dish Row to Create Event
  const handleAddDishRow = () => {
    setDishes((prev) => [
      ...prev,
      {
        dish_name: "",
        session: "Lunch",
        category: "Main Course",
        prepared_kg: 10.0,
        consumed_kg: 8.5,
        leftover_kg: 1.5,
        reuse_kg: 0.5,
        waste_kg: 1.0,
        waste_cost: 150.0,
        item_cost: 150.0,
      },
    ]);
  };

  const handleRemoveDishRow = (idx: number) => {
    setDishes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDishChange = (idx: number, field: string, val: any) => {
    setDishes((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      // Auto compute leftover if prepared & consumed change
      if (field === "prepared_kg" || field === "consumed_kg") {
        const prep = Number(field === "prepared_kg" ? val : copy[idx].prepared_kg) || 0;
        const cons = Number(field === "consumed_kg" ? val : copy[idx].consumed_kg) || 0;
        copy[idx].leftover_kg = Math.max(0, Number((prep - cons).toFixed(2)));
      }
      return copy;
    });
  };

  const handleOpenDetail = async (ev: EventItem) => {
    setSelectedDetailEvent(ev);
    setLoadingDetailFull(true);
    setDetailFullData(null);
    try {
      const res = await apiRequest<any>(`/api/events/${ev.id}`);
      setDetailFullData(res);
    } catch (err) {
      console.error("Failed to load event detailed analytics:", err);
    } finally {
      setLoadingDetailFull(false);
    }
  };

  // Submit Create Event
  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEvent(true);
    setCreateError(null);

    // Validate mass balance across dish items
    for (const d of dishes) {
      if (!d.dish_name.trim()) {
        setCreateError("Please provide names for all dish entries.");
        setSavingEvent(false);
        return;
      }
      const left = Number(d.leftover_kg) || 0;
      const reuse = Number(d.reuse_kg) || 0;
      const waste = Number(d.waste_kg) || 0;
      if (Math.abs(left - (reuse + waste)) > 0.05) {
        setCreateError(
          `Mass balance discrepancy in "${d.dish_name}": Leftovers (${left} kg) must equal Reused (${reuse} kg) + Waste (${waste} kg).`
        );
        setSavingEvent(false);
        return;
      }
    }

    try {
      const payload = {
        hotel_id: hotelId,
        name: eventName,
        event_date: eventDate,
        event_type: eventType,
        event_subtype: eventSubtype,
        client_name: clientName || undefined,
        service_format: serviceFormat,
        venue,
        expected_guests: Number(expectedPax),
        actual_guests: Number(actualPax),
        notes: notes || undefined,
        dishes: dishes.map((d) => ({
          name: d.dish_name,
          category: d.category,
          session: d.session,
          prepared_weight_kg: Number(d.prepared_kg),
          consumed_weight_kg: Number(d.consumed_kg),
          leftover_weight_kg: Number(d.leftover_kg),
          reuse_weight_kg: Number(d.reuse_kg),
          waste_weight_kg: Number(d.waste_kg),
          waste_cost: Number(d.waste_cost),
          cost_per_kg: Number(d.item_cost),
        })),
      };

      await apiRequest("/api/events", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setCreateModalOpen(false);
      setFormStep(1);
      fetchEvents();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create event");
    } finally {
      setSavingEvent(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.client_name && e.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.hotel_name && e.hotel_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 mb-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              Banquet & Event Operations
            </div>
            <h2 className="font-serif text-xl font-bold text-slate-900">
              Event Intelligence & Ledger Management
            </h2>
            <p className="text-xs text-slate-500">
              Track individual weddings, corporate galas, and banquets with strict mass-balance validation, dish breakdowns, and safe deletion.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search event name, client, hotel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs py-2 px-3 border border-slate-200 rounded-xl bg-white focus:outline-hidden text-slate-700"
            >
              <option value="all">All Event Categories</option>
              <option value="Corporate">Corporate</option>
              <option value="Birthday">Birthday</option>
              <option value="Wedding">Wedding</option>
              <option value="Conference">Conference</option>
              <option value="Social">Social</option>
              <option value="Regular Hotel Operations">Regular Hotel Operations</option>
            </select>

            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Show Archived</span>
            </label>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="hotel-card bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading event records...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="font-serif text-sm font-bold text-slate-800">
              No matching events found
            </h4>
            <p className="text-xs text-slate-400">
              Try adjusting your search filters or click "Create Event" to enter a new banquet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70 font-semibold">
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4">Hotel & Venue</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Guests (Pax)</th>
                  <th className="py-3 px-4 text-right">Prepared</th>
                  <th className="py-3 px-4 text-right">Consumed</th>
                  <th className="py-3 px-4 text-right">Waste Rate %</th>
                  <th className="py-3 px-4 text-right">Waste / Guest</th>
                  <th className="py-3 px-4 text-right">Waste Cost</th>
                  <th className="py-3 px-4 text-center">Data Health</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((ev) => {
                  const isArchived = ev.is_archived;
                  return (
                    <tr
                      key={ev.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isArchived ? "bg-slate-50/60 opacity-60" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(ev)}
                            title="Click to view full event insights, charts, and dish breakdown"
                            className="font-bold text-slate-900 hover:text-emerald-700 hover:underline text-left cursor-pointer transition-colors"
                          >
                            {ev.name}
                          </button>
                          {isArchived && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                              Archived
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-slate-700">{ev.event_type}</span>
                          {ev.event_subtype && <span>• {ev.event_subtype}</span>}
                          {ev.client_name && <span>• Client: {ev.client_name}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{ev.hotel_name || "Hotel"}</div>
                        <div className="text-[11px] text-slate-500">{ev.venue || "Banquet Hall"}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono">
                        {ev.event_date}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {ev.actual_guests || ev.expected_guests}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {formatKg(ev.total_prepared_kg)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        {formatKg(ev.total_consumed_kg)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            ev.waste_percentage <= 5 ? "text-emerald-700" : "text-rose-700"
                          }
                        >
                          {ev.waste_percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {ev.waste_per_guest_grams.toFixed(0)}g
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(ev.total_waste_cost)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.data_completeness_pct >= 90
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {ev.data_completeness_pct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(ev)}
                            title="Inspect Event Analytics & Graphs"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isArchived ? (
                            <button
                              onClick={() => handleRestoreEvent(ev.id)}
                              title="Restore archived event"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenDelete(ev)}
                              title="Safely delete / archive event"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  {formStep === 1 ? "Create Operational Event" : "Add Meal Sessions & Dishes"}
                </h3>
                <p className="text-xs text-slate-500">
                  Step {formStep} of 2 • Enter banquet metadata and itemized culinary records with mass-balance checks.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEventSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {formStep === 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Hotel Property *</label>
                    <select
                      value={hotelId}
                      onChange={(e) => setHotelId(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                      required
                    >
                      <option value={1}>Hotel Sahara</option>
                      <option value={2}>Hotel Sitara</option>
                      <option value={3}>Dolphin Hotels</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Event Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Tech Annual Conference"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Event Date *</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Event Category *</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                      required
                    >
                      <option value="Corporate">Corporate</option>
                      <option value="Birthday">Birthday</option>
                      <option value="Wedding">Wedding</option>
                      <option value="Conference">Conference</option>
                      <option value="Social">Social</option>
                      <option value="Regular Hotel Operations">Regular Hotel Operations</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Subtype / Format</label>
                    <input
                      type="text"
                      placeholder="e.g. Product Launch, Gala Dinner"
                      value={eventSubtype}
                      onChange={(e) => setEventSubtype(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Organizer / Client</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Technologies Inc."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Service Format</label>
                    <select
                      value={serviceFormat}
                      onChange={(e) => setServiceFormat(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="Buffet">Buffet</option>
                      <option value="Banquet Set Menu">Banquet Set Menu</option>
                      <option value="À la Carte">À la Carte</option>
                      <option value="Cocktail & Finger Food">Cocktail & Finger Food</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Venue / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Peacock Banquet Hall"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Expected Guests (Pax) *</label>
                    <input
                      type="number"
                      min={1}
                      value={expectedPax}
                      onChange={(e) => setExpectedPax(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Actual Guests Served *</label>
                    <input
                      type="number"
                      min={0}
                      value={actualPax}
                      onChange={(e) => setActualPax(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                </div>
              ) : (
                /* Step 2: Dishes & Food Flow */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">
                        Dish Production & Waste Mass-Balance
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Verify that: Leftover = Reused + Discarded Waste for every item.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDishRow}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Dish Row
                    </button>
                  </div>

                  <div className="space-y-3">
                    {dishes.map((d, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            placeholder="Dish Name *"
                            value={d.dish_name}
                            onChange={(e) => handleDishChange(idx, "dish_name", e.target.value)}
                            className="p-2 border border-slate-200 rounded-lg bg-white"
                            required
                          />
                          <select
                            value={d.session}
                            onChange={(e) => handleDishChange(idx, "session", e.target.value)}
                            className="p-2 border border-slate-200 rounded-lg bg-white"
                          >
                            <option value="Breakfast">Breakfast</option>
                            <option value="Lunch">Lunch</option>
                            <option value="Hi-Tea">Hi-Tea</option>
                            <option value="Dinner">Dinner</option>
                          </select>
                          <select
                            value={d.category}
                            onChange={(e) => handleDishChange(idx, "category", e.target.value)}
                            className="p-2 border border-slate-200 rounded-lg bg-white"
                          >
                            <option value="Starters">Starters</option>
                            <option value="Main Course">Main Course</option>
                            <option value="Rice">Rice</option>
                            <option value="Desserts">Desserts</option>
                            <option value="Beverages">Beverages</option>
                          </select>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="₹ Cost/kg"
                              value={d.item_cost}
                              onChange={(e) => handleDishChange(idx, "item_cost", e.target.value)}
                              className="p-2 border border-slate-200 rounded-lg bg-white w-full"
                            />
                            {dishes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDishRow(idx)}
                                className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quantities Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-200/60">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Cooked (kg)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.prepared_kg}
                              onChange={(e) => handleDishChange(idx, "prepared_kg", e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Eaten (kg)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.consumed_kg}
                              onChange={(e) => handleDishChange(idx, "consumed_kg", e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Leftover (kg)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.leftover_kg}
                              onChange={(e) => handleDishChange(idx, "leftover_kg", e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-700 block">Reused (kg)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.reuse_kg}
                              onChange={(e) => handleDishChange(idx, "reuse_kg", e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded-lg bg-white text-emerald-800 font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-rose-700 block">Waste (kg)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.waste_kg}
                              onChange={(e) => handleDishChange(idx, "waste_kg", e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded-lg bg-white text-rose-800 font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {formStep === 2 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Back to Event Info
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 text-slate-500 text-xs font-semibold hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>

                  {formStep === 1 ? (
                    <button
                      type="button"
                      disabled={!eventName.trim()}
                      onClick={() => setFormStep(2)}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                    >
                      Next: Add Dishes & Quantities
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={savingEvent}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {savingEvent && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      Save & Commit Event
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFE DELETE CONFIRMATION MODAL */}
      {deleteModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-slate-900">
                  Archive Event: {deleteModalEvent.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {deleteModalEvent.event_date} • {deleteModalEvent.hotel_name || "Hotel"}
                </p>
              </div>
            </div>

            {loadingDeleteImpact ? (
              <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
                Auditing dependent food items and scan linkages...
              </div>
            ) : deleteImpact ? (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Associated Dish Items:</span>
                    <strong className="text-slate-900">{deleteImpact.food_items_count}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Camera AI Scans:</span>
                    <strong className="text-slate-900">{deleteImpact.waste_scans_count}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Active Analytics Ledger Records:</span>
                    <strong className="text-slate-900">{deleteImpact.analytics_records_count}</strong>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {deleteImpact.message}
                </p>
              </div>
            ) : null}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalEvent(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Safe Archival
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVENT DEEP-DIVE & VISUAL INSIGHTS MODAL */}
      {selectedDetailEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedDetailEvent.event_type}
                  </span>
                  {selectedDetailEvent.event_subtype && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {selectedDetailEvent.event_subtype}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                    {selectedDetailEvent.service_format || "Buffet"}
                  </span>
                  {selectedDetailEvent.is_archived && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                      Archived
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                  {selectedDetailEvent.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                  <span>Hotel: <strong className="text-slate-800 font-semibold">{selectedDetailEvent.hotel_name || "Hotel"}</strong></span>
                  <span>• Date: <strong className="text-slate-800 font-semibold">{selectedDetailEvent.event_date}</strong></span>
                  <span>• Attendance: <strong className="text-slate-900 font-bold">{selectedDetailEvent.actual_guests || selectedDetailEvent.expected_guests} covers</strong> ({selectedDetailEvent.expected_guests} expected)</span>
                  {selectedDetailEvent.venue && <span>• Venue: <strong className="text-slate-800 font-semibold">{selectedDetailEvent.venue}</strong></span>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Print event summary"
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDetailEvent(null);
                    setDetailFullData(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* 4 Core Hero Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Food Prepared</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {formatKg(selectedDetailEvent.total_prepared_kg)}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">100% production</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Food Consumed</span>
                  <div className="text-xl font-bold font-mono text-emerald-800 mt-1">
                    {formatKg(selectedDetailEvent.total_consumed_kg)}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
                    {selectedDetailEvent.total_prepared_kg > 0
                      ? `${((selectedDetailEvent.total_consumed_kg / selectedDetailEvent.total_prepared_kg) * 100).toFixed(1)}% eaten by guests`
                      : "Direct consumption"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">Safely Reused</span>
                  <div className="text-xl font-bold font-mono text-teal-800 mt-1">
                    {formatKg(selectedDetailEvent.total_reuse_kg)}
                  </div>
                  <span className="text-[11px] text-teal-700 font-medium mt-0.5 block">
                    {selectedDetailEvent.total_leftover_kg > 0
                      ? `${((selectedDetailEvent.total_reuse_kg / selectedDetailEvent.total_leftover_kg) * 100).toFixed(1)}% leftovers diverted`
                      : "0.0% diverted"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Final Waste & Loss</span>
                  <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                    {formatKg(selectedDetailEvent.total_waste_kg)}
                  </div>
                  <span className="text-[11px] text-rose-700 font-semibold mt-0.5 block">
                    {formatINR(selectedDetailEvent.total_waste_cost)} loss ({selectedDetailEvent.waste_percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Dynamic Visual Food-Flow Balance Bars */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    Operational Food Flow & Mass Balance
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    Waste / Guest: <strong className="text-slate-900">{selectedDetailEvent.waste_per_guest_grams.toFixed(0)}g</strong>
                  </span>
                </div>

                {/* Production Stage Flow Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Stage 1: Production Utilization</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Consumed: {formatKg(selectedDetailEvent.total_consumed_kg)} • Leftover: {formatKg(selectedDetailEvent.total_leftover_kg)}
                    </span>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          selectedDetailEvent.total_prepared_kg > 0
                            ? (selectedDetailEvent.total_consumed_kg / selectedDetailEvent.total_prepared_kg) * 100
                            : 0
                        )}%`,
                      }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                      title="Consumed Food"
                    />
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          selectedDetailEvent.total_prepared_kg > 0
                            ? (selectedDetailEvent.total_leftover_kg / selectedDetailEvent.total_prepared_kg) * 100
                            : 0
                        )}%`,
                      }}
                      className="bg-amber-400 h-full transition-all duration-500"
                      title="Leftover Food"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Consumed: {selectedDetailEvent.total_prepared_kg > 0 ? ((selectedDetailEvent.total_consumed_kg / selectedDetailEvent.total_prepared_kg) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                      Leftovers: {selectedDetailEvent.total_prepared_kg > 0 ? ((selectedDetailEvent.total_leftover_kg / selectedDetailEvent.total_prepared_kg) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>

                {/* Disposition Stage Flow Bar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Stage 2: Leftover Disposition</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Reused: {formatKg(selectedDetailEvent.total_reuse_kg)} • Discarded Waste: {formatKg(selectedDetailEvent.total_waste_kg)}
                    </span>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          selectedDetailEvent.total_leftover_kg > 0
                            ? (selectedDetailEvent.total_reuse_kg / selectedDetailEvent.total_leftover_kg) * 100
                            : 0
                        )}%`,
                      }}
                      className="bg-teal-500 h-full transition-all duration-500"
                      title="Safely Reused"
                    />
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          selectedDetailEvent.total_leftover_kg > 0
                            ? (selectedDetailEvent.total_waste_kg / selectedDetailEvent.total_leftover_kg) * 100
                            : 0
                        )}%`,
                      }}
                      className="bg-rose-500 h-full transition-all duration-500"
                      title="Final Discarded Waste"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                      Reused (Diverted): {selectedDetailEvent.total_leftover_kg > 0 ? ((selectedDetailEvent.total_reuse_kg / selectedDetailEvent.total_leftover_kg) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      Final Waste: {selectedDetailEvent.total_leftover_kg > 0 ? ((selectedDetailEvent.total_waste_kg / selectedDetailEvent.total_leftover_kg) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Event Evidence-Based Insights & Recommendations */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    Event Intelligence & Kitchen Recommendations
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Observation 1: Production Mismatch */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-100/80 shadow-2xs space-y-1">
                    <span className="font-bold text-slate-900 block">
                      Production vs. Actual Attendance
                    </span>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {selectedDetailEvent.waste_percentage > 15
                        ? `Elevated waste rate of ${selectedDetailEvent.waste_percentage.toFixed(1)}% observed with ${selectedDetailEvent.actual_guests || selectedDetailEvent.expected_guests} guests. Excess leftovers originated from kitchen over-batching rather than guest no-shows.`
                        : `Healthy production alignment. Prepared quantities matched guest consumption with a controlled waste rate of ${selectedDetailEvent.waste_percentage.toFixed(1)}%.`}
                    </p>
                  </div>

                  {/* Observation 2: Guest Benchmark */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-100/80 shadow-2xs space-y-1">
                    <span className="font-bold text-slate-900 block">
                      Guest Waste Intensity Benchmark
                    </span>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {selectedDetailEvent.waste_per_guest_grams > 150
                        ? `Average loss of ${selectedDetailEvent.waste_per_guest_grams.toFixed(0)}g per guest is above the hospitality banquet benchmark (<120g). Recommend reducing buffet tray replenishment depth during late service.`
                        : `Efficient portion control: ${selectedDetailEvent.waste_per_guest_grams.toFixed(0)}g per attendee is within optimal hospitality banquet guidelines.`}
                    </p>
                  </div>

                  {/* Observation 3: Financial Loss Driver */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-100/80 shadow-2xs space-y-1">
                    <span className="font-bold text-slate-900 block">
                      Financial Loss Driver
                    </span>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Total food loss amounted to <strong>{formatINR(selectedDetailEvent.total_waste_cost)}</strong> across {selectedDetailEvent.food_items_count || 1} menu items. Adjusting secondary replenishment batches can protect kitchen food cost margins.
                    </p>
                  </div>

                  {/* Observation 4: Diversion Compliance */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-100/80 shadow-2xs space-y-1">
                    <span className="font-bold text-slate-900 block">
                      Food Safety & Diversion
                    </span>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {selectedDetailEvent.total_reuse_kg > 0
                        ? `Successfully diverted ${formatKg(selectedDetailEvent.total_reuse_kg)} for safe kitchen repurposing or staff meal allocations under HACCP temperature standards.`
                        : `No approved food reuse logged. Unserved kitchen batches should be temperature-verified for safe blast-chilling.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Itemized Dishes Breakdown Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                    Itemized Dish Records & Cost Impact
                  </h4>
                  {loadingDetailFull && (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                      Loading dish ledger...
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3.5">Dish Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Prepared</th>
                        <th className="py-2.5 px-3 text-right">Discarded Waste</th>
                        <th className="py-2.5 px-3 text-right">Waste %</th>
                        <th className="py-2.5 px-3 text-right">Cost Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {detailFullData?.event_foods && detailFullData.event_foods.length > 0 ? (
                        detailFullData.event_foods.map((food: any) => (
                          <tr key={food.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-900">
                              {food.food_item_name}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-600">
                              {food.food_item_category}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-800">
                              {formatKg(food.prepared_weight_kg)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-rose-700 font-bold">
                              {formatKg(food.net_waste_kg)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={
                                  food.waste_percentage <= 5 ? "text-emerald-700" : "text-rose-700"
                                }
                              >
                                {food.waste_percentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatINR(food.waste_cost)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400 font-sans">
                            {loadingDetailFull
                              ? "Retrieving individual dish quantities..."
                              : "No itemized dishes recorded for this event."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
              <a
                href={`/events/${selectedDetailEvent.id}/analytics`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Open Camera AI Scans & Verification Report
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDetailEvent(null);
                    setDetailFullData(null);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
