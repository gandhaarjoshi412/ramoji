"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { Calendar, ArrowLeft, PlusCircle, AlertCircle } from "lucide-react";

export default function NewEventPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("Wedding");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expectedGuests, setExpectedGuests] = useState<string>("500");
  const [actualGuests, setActualGuests] = useState<string>("467");
  const [status, setStatus] = useState("Active");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Event name is required.");
      return;
    }
    if (!eventDate) {
      setError("Event date is required.");
      return;
    }

    const exp = parseInt(expectedGuests) || 0;
    const act = parseInt(actualGuests) || 0;

    if (exp < 0 || act < 0) {
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
          venue: venue.trim() || undefined,
          event_date: eventDate,
          expected_guests: exp,
          actual_guests: act,
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
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/events"
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Create Banquet Event
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Setup banquet profile to manage food preparation and waste tracking
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="font-medium">{error}</div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Event Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Event Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ABC Wedding, Corporate Gala, Annual Summit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Event Type & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Wedding">Wedding</option>
                <option value="Conference">Conference</option>
                <option value="Corporate">Corporate</option>
                <option value="Social">Social</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Event Date *
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              >
              </input>
            </div>
          </div>

          {/* Venue & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Venue / Hall Location
              </label>
              <input
                type="text"
                placeholder="e.g. Grand Ballroom, Poolside Lawn, Hall B"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Active">Active (In Service)</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Guests: Expected & Actual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Expected Guests
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 500"
                value={expectedGuests}
                onChange={(e) => setExpectedGuests(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Contracted headcount</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Actual Guests Served
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 467"
                value={actualGuests}
                onChange={(e) => setActualGuests(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">For per-guest waste analytics</p>
            </div>
          </div>

          {/* Operational Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Banquet Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Buffet menu with live counter stations; high dessert demand expected."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/events"
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              {loading ? "Creating..." : "Save & Add Menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
