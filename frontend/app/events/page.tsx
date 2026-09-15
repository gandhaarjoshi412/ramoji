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
  Plus,
  Search,
  Filter,
  Eye,
  FileText,
  Users,
  Utensils,
  ChevronRight,
  Camera,
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
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Banquet Event Registry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {events.length} Banquets
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Complete banquet history, food volume logs, and kitchen loss metrics
          </p>
        </div>
        <Link
          href="/events/new"
          className="hotel-btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Banquet Event
        </Link>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="hotel-card p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search banquet name or hall..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:bg-white text-slate-900"
          />
        </form>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-slate-400 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-slate-400 cursor-pointer"
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
            className="hotel-btn-secondary py-2 text-xs"
          >
            Apply
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Events Table */}
      <div className="hotel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Event Name & Venue</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4 text-center">Guests</th>
                <th className="py-3.5 px-4 text-right">Prepared</th>
                <th className="py-3.5 px-4 text-right">Wasted</th>
                <th className="py-3.5 px-4 text-right">Loss %</th>
                <th className="py-3.5 px-4 text-right">Cost Loss</th>
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
                      className="font-bold text-slate-900 hover:text-slate-700 block text-sm"
                    >
                      {event.name}
                    </Link>
                    {event.venue && (
                      <span className="text-xs text-slate-400 font-normal">
                        {event.venue}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                    {event.event_date}
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {event.event_type}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-xs font-medium text-slate-600">
                    <span className="text-slate-400">{event.expected_guests}</span> /{" "}
                    <span className="text-slate-900 font-bold">{event.actual_guests || 0}</span>
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                    {formatKg(event.total_prepared_kg)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                    {formatKg(event.total_waste_kg)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-slate-800">
                    {event.waste_percentage}%
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                    {formatINR(event.total_waste_cost)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/events/${event.id}`}
                        className="hotel-btn-secondary text-[11px] py-1 px-2.5 rounded-md"
                        title="View Event & Menu"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Audit
                      </Link>
                      <Link
                        href={`/events/${event.id}/scan`}
                        className="hotel-btn-primary text-[11px] py-1 px-2.5 rounded-md"
                        title="Camera Dish Scan"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Scan
                      </Link>
                      <Link
                        href={`/events/${event.id}/report`}
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
                        title="Executive Report"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {events.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs font-medium">
                    No banquet events found. Click &quot;Create Banquet Event&quot; to add your first event.
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
