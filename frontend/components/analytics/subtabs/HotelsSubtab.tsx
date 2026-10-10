"use client";

import React, { useEffect, useState, useMemo } from "react";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import {
  HotelAnalyticsResponse,
  HotelAnalyticsSummary,
  AnalyticsSubtabId,
  AnalyticsOverviewResponse,
} from "@/types/analytics";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Users,
  ShieldCheck,
  Sparkles,
  Info,
  RefreshCw,
  BarChart3,
  UtensilsCrossed,
  CalendarDays,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Flame,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  X,
  ChefHat,
  Eye,
} from "lucide-react";

interface HotelsSubtabProps {
  selectedHotel: string;
  onSelectHotel: (hotelName: string) => void;
  onChangeTab?: (tab: AnalyticsSubtabId) => void;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
}

type ChartMetric = "waste_rate" | "waste_cost" | "waste_per_guest";
type TableSortColumn = "hotel_name" | "waste_rate_pct" | "waste_per_guest_g" | "total_prepared_kg" | "total_waste_cost" | "total_pax" | "data_quality_score_pct";

export const HotelsSubtab: React.FC<HotelsSubtabProps> = ({
  selectedHotel,
  onSelectHotel,
  onChangeTab,
  datePreset = "all",
  startDate,
  endDate,
}) => {
  const [data, setData] = useState<HotelAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drilldown hotel inspection state
  const [drilldownHotel, setDrilldownHotel] = useState<string | null>(
    selectedHotel !== "all" ? selectedHotel : null
  );
  const [drilldownData, setDrilldownData] = useState<AnalyticsOverviewResponse | null>(null);
  const [drilldownEvents, setDrilldownEvents] = useState<any[]>([]);
  const [loadingDrilldown, setLoadingDrilldown] = useState<boolean>(false);

  // Visual comparison metric selector
  const [chartMetric, setChartMetric] = useState<ChartMetric>("waste_rate");

  // Table sorting
  const [sortCol, setSortCol] = useState<TableSortColumn>("waste_rate_pct");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Fetch summary data
  const loadHotelAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (datePreset && datePreset !== "all") query.set("date_preset", datePreset);
      if (startDate) query.set("start_date", startDate);
      if (endDate) query.set("end_date", endDate);

      const res = await apiRequest<HotelAnalyticsResponse>(
        `/api/analytics/hotels?${query.toString()}`
      );
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load hotel analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotelAnalytics();
  }, [datePreset, startDate, endDate]);

  // Sync drilldown with parent selectedHotel if parent changes
  useEffect(() => {
    if (selectedHotel && selectedHotel !== "all") {
      setDrilldownHotel(selectedHotel);
    }
  }, [selectedHotel]);

  // Fetch drilldown details when drilldownHotel changes
  useEffect(() => {
    if (!drilldownHotel || drilldownHotel === "all") {
      setDrilldownData(null);
      setDrilldownEvents([]);
      return;
    }

    let isCurrent = true;
    async function fetchHotelDrilldown() {
      setLoadingDrilldown(true);
      try {
        const query = new URLSearchParams();
        query.set("hotel", drilldownHotel!);
        if (datePreset && datePreset !== "all") query.set("date_preset", datePreset);
        if (startDate) query.set("start_date", startDate);
        if (endDate) query.set("end_date", endDate);

        const [overviewRes, eventsRes] = await Promise.all([
          apiRequest<AnalyticsOverviewResponse>(`/api/analytics/overview?${query.toString()}`).catch(() => null),
          apiRequest<any[]>(`/api/events?${query.toString()}`).catch(() => []),
        ]);

        if (isCurrent) {
          setDrilldownData(overviewRes);
          setDrilldownEvents(eventsRes || []);
        }
      } catch (err) {
        console.error("Failed to load drilldown for hotel:", err);
      } finally {
        if (isCurrent) setLoadingDrilldown(false);
      }
    }

    fetchHotelDrilldown();
    return () => {
      isCurrent = false;
    };
  }, [drilldownHotel, datePreset, startDate, endDate]);

  const hotels = data?.hotels || [];
  const benchmark = data?.portfolio_benchmark;

  // Selected drilldown hotel summary item from data
  const activeDrilldownSummary = useMemo(() => {
    if (!drilldownHotel) return null;
    return hotels.find((h) => h.hotel_name.toLowerCase() === drilldownHotel.toLowerCase()) || null;
  }, [hotels, drilldownHotel]);

  // Sorted hotels for matrix table
  const sortedHotels = useMemo(() => {
    const list = [...hotels];
    list.sort((a, b) => {
      let valA: any = a[sortCol];
      let valB: any = b[sortCol];
      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    });
    return list;
  }, [hotels, sortCol, sortAsc]);

  const handleToggleSort = (col: TableSortColumn) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  const handleSelectHotelAndDrilldown = (hotelName: string) => {
    onSelectHotel(hotelName);
    setDrilldownHotel(hotelName);
  };

  const handleNavigateToSubtab = (hotelName: string, subtab: AnalyticsSubtabId) => {
    onSelectHotel(hotelName);
    if (onChangeTab) {
      onChangeTab(subtab);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-100 rounded-2xl border border-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-slate-100 rounded-2xl border border-slate-200" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl border border-slate-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{error || "Unable to load hotel property comparison."}</span>
        </div>
        <button
          onClick={loadHotelAnalytics}
          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Hotel Selection Header Banner */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              Property Intelligence & Multi-Hotel Portfolio
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hotel-Wise Performance & Normalized Benchmarking
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare properties using fair per-guest normalized metrics to prevent large banquets from unfairly appearing worse than smaller operations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSelectHotel("all");
                setDrilldownHotel(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedHotel === "all"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              All Hotels (Consolidated)
            </button>
            <button
              onClick={loadHotelAnalytics}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Refresh Property Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Hotel Switcher Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Properties:
            </span>
            {hotels.map((h) => {
              const isSelected = selectedHotel.toLowerCase() === h.hotel_name.toLowerCase();
              const isDrilldown = drilldownHotel?.toLowerCase() === h.hotel_name.toLowerCase();
              return (
                <button
                  key={h.hotel_name}
                  onClick={() => handleSelectHotelAndDrilldown(h.hotel_name)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold"
                      : isDrilldown
                      ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${isSelected || isDrilldown ? "text-white" : "text-slate-400"}`} />
                  <span>{h.hotel_name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected || isDrilldown
                        ? "bg-white/20 text-white"
                        : h.waste_rate_pct <= 6
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {h.waste_rate_pct.toFixed(1)}% waste
                  </span>
                </button>
              );
            })}
          </div>

          {selectedHotel !== "all" && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Active Global Filter: <strong>{selectedHotel}</strong>
              </span>
              <button
                onClick={() => {
                  onSelectHotel("all");
                  setDrilldownHotel(null);
                }}
                className="ml-2 text-slate-500 hover:text-slate-800 font-bold"
                title="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {hotels.map((h) => {
          const isSelected = selectedHotel.toLowerCase() === h.hotel_name.toLowerCase();
          const isDrilldown = drilldownHotel?.toLowerCase() === h.hotel_name.toLowerCase();
          const hasRecords = h.total_records > 0;
          const displayStatus = hasRecords ? h.performance_status : "No Activity";
          const statusColors = !hasRecords
            ? "bg-slate-100 text-slate-600 border-slate-200"
            : h.performance_status === "Excellent"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : h.performance_status === "Good"
            ? "bg-blue-50 text-blue-800 border-blue-200"
            : h.performance_status === "Moderate"
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : "bg-rose-50 text-rose-800 border-rose-200";

          return (
            <div
              key={h.hotel_name}
              className={`hotel-card p-5 bg-white rounded-2xl border transition-all flex flex-col justify-between ${
                isDrilldown
                  ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                  : isSelected
                  ? "border-slate-800 ring-2 ring-slate-800/10 shadow-sm"
                  : "border-slate-200/90 hover:border-slate-300 shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-base font-bold text-slate-900">
                      {h.hotel_name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{h.location}</p>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${statusColors}`}
                  >
                    {displayStatus}
                  </span>
                </div>

                {/* Core Normalized Metrics */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Waste Rate
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={`text-xl font-bold font-serif ${h.waste_rate_pct <= (benchmark?.portfolio_waste_rate_pct || 6) ? "text-emerald-700" : "text-rose-700"}`}>
                        {h.waste_rate_pct.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-500">of prep</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Waste / Guest
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-bold text-slate-900 font-serif">
                        {h.waste_per_guest_g.toFixed(0)}g
                      </span>
                      <span className="text-[10px] text-slate-500">per pax</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Numbers */}
                <div className="space-y-2 mt-4 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Food Prepared:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {formatKg(h.total_prepared_kg)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Food Consumed:</span>
                    <span className="font-semibold text-emerald-700 font-mono">
                      {formatKg(h.total_consumed_kg)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Safely Reused:</span>
                    <span className="font-semibold text-emerald-700 font-mono">
                      {formatKg(h.total_reuse_kg)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Discarded Waste:</span>
                    <span className="font-semibold text-rose-700 font-mono">
                      {formatKg(h.total_waste_kg)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
                    <span className="font-semibold">Procurement Loss:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatINR(h.total_waste_cost)}
                    </span>
                  </div>
                </div>

                {/* Audit Health */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  {!hasRecords ? (
                    <span className="text-slate-400">No Records</span>
                  ) : h.mass_balance_reconciled ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Variance {Math.abs(h.leftover_variance_kg).toFixed(1)}kg
                    </span>
                  )}
                  <span>DQ Health: {hasRecords ? `${h.data_quality_score_pct.toFixed(0)}%` : "N/A"}</span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectHotelAndDrilldown(h.hotel_name)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isDrilldown
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isDrilldown ? "Viewing Drilldown" : "Deep-Dive Property"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateToSubtab(h.hotel_name, "overview")}
                  title="Filter to this hotel and view executive overview"
                  className="py-2 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Overview</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Interactive Property Deep-Dive Inspection Workspace (Opens when a hotel is selected) */}
      {drilldownHotel && activeDrilldownSummary && (
        <div className="hotel-card p-6 bg-white border border-emerald-200 rounded-2xl shadow-sm space-y-6 animate-in fade-in">
          {/* Deep-Dive Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Property Deep-Dive Inspection • {activeDrilldownSummary.hotel_name}
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{activeDrilldownSummary.hotel_name}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-sans font-semibold">
                  {activeDrilldownSummary.dates_recorded_count} Dates Recorded
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {activeDrilldownSummary.location} • {activeDrilldownSummary.total_events} Events • {activeDrilldownSummary.total_sessions} Service Shifts • {activeDrilldownSummary.total_pax.toLocaleString()} Guests Served
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleNavigateToSubtab(activeDrilldownSummary.hotel_name, "overview")}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>View Full Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleNavigateToSubtab(activeDrilldownSummary.hotel_name, "events")}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>View Property Events</span>
              </button>
              <button
                type="button"
                onClick={() => setDrilldownHotel(null)}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Close drilldown panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drilldown KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Food Prepared</span>
              <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                {formatKg(activeDrilldownSummary.total_prepared_kg)}
              </span>
              <span className="text-[10px] text-slate-400">total production</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Food Consumed</span>
              <span className="text-lg font-bold font-mono text-emerald-700 mt-0.5 block">
                {formatKg(activeDrilldownSummary.total_consumed_kg)}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">
                {activeDrilldownSummary.total_prepared_kg > 0
                  ? ((activeDrilldownSummary.total_consumed_kg / activeDrilldownSummary.total_prepared_kg) * 100).toFixed(1)
                  : "0.0"}% consumption
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Discarded Waste</span>
              <span className="text-lg font-bold font-mono text-rose-700 mt-0.5 block">
                {formatKg(activeDrilldownSummary.total_waste_kg)}
              </span>
              <span className="text-[10px] text-rose-600 font-semibold">
                {activeDrilldownSummary.waste_rate_pct.toFixed(1)}% waste rate
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Waste / Guest</span>
              <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                {activeDrilldownSummary.waste_per_guest_g.toFixed(0)}g
              </span>
              <span className="text-[10px] text-slate-500">
                vs {benchmark?.portfolio_waste_per_guest_g.toFixed(0)}g portfolio
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Safely Diverted</span>
              <span className="text-lg font-bold font-mono text-emerald-700 mt-0.5 block">
                {formatKg(activeDrilldownSummary.total_reuse_kg)}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">kitchen repurpose</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Procurement Loss</span>
              <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                {formatINR(activeDrilldownSummary.total_waste_cost)}
              </span>
              <span className="text-[10px] text-slate-500">₹{activeDrilldownSummary.waste_cost_per_guest.toFixed(1)} / pax</span>
            </div>
          </div>

          {/* Drilldown Details Grid: Dishes + Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
            {/* Top Wasted Dishes at this Property */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                  Top Waste Dishes at {activeDrilldownSummary.hotel_name}
                </h4>
                {drilldownData?.top_wasted_dishes && (
                  <button
                    type="button"
                    onClick={() => handleNavigateToSubtab(activeDrilldownSummary.hotel_name, "food_dishes")}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    All Dishes <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {loadingDrilldown ? (
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading dish consumption records...
                </div>
              ) : drilldownData?.top_wasted_dishes && drilldownData.top_wasted_dishes.length > 0 ? (
                <div className="space-y-2">
                  {drilldownData.top_wasted_dishes.slice(0, 4).map((d, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{d.dish_name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {d.category} • Prepared: {formatKg(d.total_prepared_kg)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-rose-700 block font-mono">
                          {formatKg(d.total_waste_kg)} ({d.waste_percentage.toFixed(1)}%)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Loss: {formatINR(d.waste_cost ?? d.total_waste_cost ?? 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No individual dish records found for this property.
                </div>
              )}
            </div>

            {/* Events Hosted at this Property */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  Banquet Events at {activeDrilldownSummary.hotel_name}
                </h4>
                {drilldownEvents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleNavigateToSubtab(activeDrilldownSummary.hotel_name, "events")}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    All {drilldownEvents.length} Events <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {loadingDrilldown ? (
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading banquet registry records...
                </div>
              ) : drilldownEvents.length > 0 ? (
                <div className="space-y-2">
                  {drilldownEvents.slice(0, 4).map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{ev.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {ev.event_type} • {ev.event_date} • {ev.actual_guests || ev.expected_guests} Pax
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-bold block font-mono ${ev.waste_percentage <= 5 ? "text-emerald-700" : "text-rose-700"}`}>
                          {ev.waste_percentage.toFixed(1)}% waste
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatINR(ev.total_waste_cost)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No individual banquet events logged for this property.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Comparative Visual Analytics Suite */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/80 mb-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              Portfolio Benchmark Comparison
            </div>
            <h3 className="font-serif text-lg font-bold text-slate-900">
              Multi-Property Comparative Visualizer
            </h3>
            <p className="text-xs text-slate-500">
              Side-by-side performance audit contrasting individual hotel metrics against the company portfolio baseline.
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartMetric("waste_rate")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartMetric === "waste_rate"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Waste Rate %
            </button>
            <button
              type="button"
              onClick={() => setChartMetric("waste_cost")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartMetric === "waste_cost"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Loss (₹)
            </button>
            <button
              type="button"
              onClick={() => setChartMetric("waste_per_guest")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartMetric === "waste_per_guest"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Waste / Guest (g)
            </button>
          </div>
        </div>

        {/* Dynamic Metric Comparison Bars */}
        <div className="space-y-4 pt-2">
          {hotels.map((h) => {
            const isBenchmark = benchmark && benchmark.portfolio_waste_rate_pct;
            let val = 0;
            let label = "";
            let maxVal = 1;
            let barColor = "bg-emerald-600";
            let diffFromBench = 0;

            if (chartMetric === "waste_rate") {
              val = h.waste_rate_pct;
              label = `${val.toFixed(2)}%`;
              maxVal = Math.max(...hotels.map((x) => x.waste_rate_pct), 15);
              diffFromBench = val - (benchmark?.portfolio_waste_rate_pct || 0);
              barColor = val <= (benchmark?.portfolio_waste_rate_pct || 5.19) ? "bg-emerald-600" : "bg-rose-600";
            } else if (chartMetric === "waste_cost") {
              val = h.total_waste_cost;
              label = formatINR(val);
              maxVal = Math.max(...hotels.map((x) => x.total_waste_cost), 10000);
              barColor = "bg-indigo-600";
            } else {
              val = h.waste_per_guest_g;
              label = `${val.toFixed(0)}g`;
              maxVal = Math.max(...hotels.map((x) => x.waste_per_guest_g), 100);
              diffFromBench = val - (benchmark?.portfolio_waste_per_guest_g || 0);
              barColor = val <= (benchmark?.portfolio_waste_per_guest_g || 39.4) ? "bg-emerald-600" : "bg-amber-500";
            }

            const pctWidth = Math.min(100, Math.max(5, (val / maxVal) * 100));

            return (
              <div key={h.hotel_name} className="space-y-1.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{h.hotel_name}</span>
                    <span className="text-[10px] text-slate-400">({h.total_records} records)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {chartMetric !== "waste_cost" && (
                      <span className={`text-[10px] font-bold ${diffFromBench <= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {diffFromBench <= 0
                          ? `${Math.abs(diffFromBench).toFixed(1)} ${chartMetric === "waste_rate" ? "%" : "g"} below benchmark`
                          : `+${diffFromBench.toFixed(1)} ${chartMetric === "waste_rate" ? "%" : "g"} above benchmark`}
                      </span>
                    )}
                    <span className="font-mono font-bold text-slate-900 text-sm">{label}</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200/80 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pctWidth}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Benchmark Reference Marker */}
          <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-600">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Consolidated Portfolio Benchmark:
            </span>
            <div className="flex items-center gap-4 text-xs font-mono font-semibold">
              <span>Waste Rate: <strong>{benchmark?.portfolio_waste_rate_pct.toFixed(2)}%</strong></span>
              <span>•</span>
              <span>Per Guest: <strong>{benchmark?.portfolio_waste_per_guest_g.toFixed(0)}g</strong></span>
              <span>•</span>
              <span>Total Loss: <strong>{formatINR(benchmark?.total_waste_cost || 0)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Normalized Portfolio Comparison Table */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-900">
              Fair Normalized Comparison Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Click any column header to sort. Normalized per-guest and per-prepared kg metrics enable direct apples-to-apples performance audits.
            </p>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Portfolio Benchmark: <strong className="text-slate-900">{benchmark?.portfolio_waste_rate_pct.toFixed(1)}%</strong> waste rate • <strong className="text-slate-900">{benchmark?.portfolio_waste_per_guest_g.toFixed(0)}g</strong> / guest
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70 font-semibold select-none">
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleToggleSort("hotel_name")}
                >
                  Hotel Property {sortCol === "hotel_name" && (sortAsc ? "↑" : "↓")}
                </th>
                <th className="py-3 px-4">Shifts / Dates</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => handleToggleSort("total_pax")}
                >
                  Guests (Pax) {sortCol === "total_pax" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => handleToggleSort("total_prepared_kg")}
                >
                  Food Prepared {sortCol === "total_prepared_kg" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => handleToggleSort("waste_rate_pct")}
                >
                  Waste Rate % {sortCol === "waste_rate_pct" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => handleToggleSort("waste_per_guest_g")}
                >
                  Waste / Guest {sortCol === "waste_per_guest_g" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => handleToggleSort("total_waste_cost")}
                >
                  Waste Cost {sortCol === "total_waste_cost" && (sortAsc ? "↑" : "↓")}
                </th>
                <th className="py-3 px-4 text-right">Cost / Guest</th>
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                  onClick={() => handleToggleSort("data_quality_score_pct")}
                >
                  Data Health {sortCol === "data_quality_score_pct" && (sortAsc ? "↑" : "↓")}
                </th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedHotels.map((h) => {
                const isSelected = selectedHotel.toLowerCase() === h.hotel_name.toLowerCase();
                const isDrilldown = drilldownHotel?.toLowerCase() === h.hotel_name.toLowerCase();

                return (
                  <tr
                    key={h.hotel_name}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isDrilldown ? "bg-emerald-50/40 font-semibold" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{h.hotel_name}</div>
                      <div className="text-[11px] text-slate-500">{h.location}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {h.dates_recorded_count} dates ({h.total_sessions} shifts)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900">
                      {h.total_pax.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900">
                      {formatKg(h.total_prepared_kg)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          h.waste_rate_pct <= (benchmark?.portfolio_waste_rate_pct || 5.19)
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }
                      >
                        {h.waste_rate_pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {h.waste_per_guest_g.toFixed(0)}g
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900">
                      {formatINR(h.total_waste_cost)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      ₹{h.waste_cost_per_guest.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.data_quality_score_pct >= 90
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {h.data_quality_score_pct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelectHotelAndDrilldown(h.hotel_name)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            isDrilldown
                              ? "bg-emerald-700 text-white shadow-2xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                          }`}
                        >
                          {isDrilldown ? "Viewing" : "Deep-Dive"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavigateToSubtab(h.hotel_name, "overview")}
                          title="Filter to this hotel and view executive overview"
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
