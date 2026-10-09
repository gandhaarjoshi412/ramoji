"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { ArrowLeft, Plus, AlertCircle } from "lucide-react";

export default function NewEventPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [eventType, setEventType] = useState(searchParams?.type || "Wedding");
  const [categories, setCategories] = useState<string[]>([
    "Wedding",
    "Conference",
    "Corporate",
    "Social",
    "Other",
  ]);
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [customEventTypeName, setCustomEventTypeName] = useState("");
  const [expectedGuests, setExpectedGuests] = useState<string>("");
  const [status, setStatus] = useState("Upcoming");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    async function loadCategories() {
      try {
        const res = await apiRequest<{ name: string }[]>("/api/events/categories");
        if (res && res.length > 0) {
          const names = res.map((c) => c.name);
          const combined = Array.from(new Set(["Corporate", "Social", "Wedding", "Conference", "Custom", ...names]));
          setCategories(combined);
        }
      } catch {
        // Fallback to default canonical list
      }
    }
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Banquet event name is required.");
      return;
    }
    if (!eventDate) {
      setError("Event date is required.");
      return;
    }

    if (eventType === "Custom" && !customEventTypeName.trim()) {
      setError("Please specify the Custom Event Type Name (e.g. Product Launch, Birthday Party, Film Crew Catering).");
      return;
    }

    const exp = parseInt(expectedGuests) || 0;

    if (exp < 0) {
      setError("Guest count cannot be negative.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest<{ id: number }>("/api/events", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          event_type: eventType,
          event_subtype: eventType === "Custom" ? customEventTypeName.trim() : undefined,
          venue: venue.trim() || undefined,
          event_date: eventDate,
          expected_guests: exp,
          actual_guests: 0,
          status,
          notes: notes.trim() || undefined,
        }),
      });

      router.push(`/events/${res.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create banquet event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <Link
          href="/events"
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900 tracking-tight">
            Create Banquet Event
          </h1>
          <p className="text-xs text-slate-500 font-normal">
            Setup banquet profile to manage food preparation and waste tracking
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="hotel-card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Event Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Banquet Event Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Royal Rajputana Wedding, Corporate Gala Dinner"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
            />
          </div>

          {/* Event Type & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Event Category
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Event Date *
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Conditional Custom Event Type Name Field */}
          {eventType === "Custom" && (
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-900">
                Custom Event Type Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Product Launch, Birthday Party, Award Ceremony, Film Crew Catering, Private Dinner, Exhibition, Training Workshop"
                value={customEventTypeName}
                onChange={(e) => setCustomEventTypeName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-amber-300 bg-white text-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
              />
              <p className="text-[11px] text-amber-700 font-medium">
                Retains its real custom classification for isolated benchmarking without contaminating predefined Corporate or Wedding standards.
              </p>
            </div>
          )}

          {/* Venue & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Banquet Hall / Venue Location
              </label>
              <input
                type="text"
                placeholder="e.g. Grand Ballroom, Royal Lawn, Crystal Hall"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Service Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all cursor-pointer"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Active">Active (In Service)</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Expected Guests */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Expected Guests
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 500"
              value={expectedGuests}
              onChange={(e) => setExpectedGuests(e.target.value)}
              className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1">Contracted headcount</p>
          </div>

          {/* Operational Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Service & Kitchen Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Buffet menu with live counter stations; high dessert demand expected."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/events"
              className="hotel-btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="hotel-btn-emerald active:scale-95"
            >
              <Plus className="w-4 h-4" />
              {loading ? "Creating..." : "Save & Configure Menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
