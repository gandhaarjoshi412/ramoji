"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import { EventListItem } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Calendar,
  PlusCircle,
  Search,
  Filter,
  Eye,
  FileText,
  Users,
  Utensils,
  Trash2,
} from "lucide-react";

export default function EventsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("event_type", typeFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await apiRequest<EventListItem[]>(`/api/events?${params.toString()}`);
      setEvents(res);
    } catch (err: any) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        fetchEvents();
      }
    }
  }, [user, authLoading, statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Banquet Events & Waste History
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Historical events, guest attendance, and post-service waste auditing
          </p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-md hover:bg-emerald-700 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Event
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search event name or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
          />
        </form>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold uppercase text-slate-500">Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Event Types</option>
            <option value="Wedding">Wedding</option>
            <option value="Corporate">Corporate</option>
            <option value="Conference">Conference</option>
            <option value="Social">Social</option>
            <option value="Other">Other</option>
          </select>

          <button
            type="button"
            onClick={fetchEvents}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Historical Events Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Event Details</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4 text-center">Guests (Exp / Act)</th>
                <th className="py-3.5 px-4 text-right">Food Prepared</th>
                <th className="py-3.5 px-4 text-right">Food Wasted</th>
                <th className="py-3.5 px-4 text-right">Waste %</th>
                <th className="py-3.5 px-4 text-right">Waste Cost (INR)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6">
                    <Link
                      href={`/events/${event.id}`}
                      className="font-bold text-slate-900 hover:text-emerald-700 hover:underline block text-sm"
                    >
                      {event.name}
                    </Link>
                    {event.venue && (
                      <span className="text-xs text-slate-400 font-medium">
                        {event.venue}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                    {event.event_date}
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      {event.event_type}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-xs font-semibold text-slate-700">
                    <span className="text-slate-400">{event.expected_guests}</span> /{" "}
                    <span className="text-slate-900 font-bold">{event.actual_guests || 0}</span>
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                    {formatKg(event.total_prepared_kg)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-red-600 whitespace-nowrap">
                    {formatKg(event.total_waste_kg)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-slate-900">
                    {event.waste_percentage}%
                  </td>
                  <td className="py-4 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                    {formatINR(event.total_waste_cost)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                        title="View Event & Menu"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Link>
                      <Link
                        href={`/events/${event.id}/report`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors"
                        title="Generate Printable Report"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Report
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {events.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No banquet events match the current filter criteria.
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
