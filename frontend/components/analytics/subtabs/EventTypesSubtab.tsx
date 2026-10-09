"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import {
  EventTypesAnalyticsResponse,
  EventTypeAnalyticsCategory,
  DishConsumptionStat,
  EventTypeTimelinePoint,
} from "@/types/analytics";
import {
  Tags,
  Users,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Info,
  Utensils,
  Calendar,
  Flame,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Plus,
  BarChart2,
  Activity,
  Layers,
} from "lucide-react";
import { CrossEventComparisonSection } from "@/components/analytics/CrossEventComparisonSection";
import { EventTypeIntelligenceWorkspace } from "@/components/analytics/EventTypeIntelligenceWorkspace";

interface EventTypesSubtabProps {
  selectedHotel: string;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
}

type TimelineGranularity = "daily" | "weekly" | "monthly";
type DishSortMode =
  | "most_consumed"
  | "least_consumed"
  | "highest_waste"
  | "highest_loss"
  | "highest_prep";

export const EventTypesSubtab: React.FC<EventTypesSubtabProps> = ({
  selectedHotel,
  datePreset = "all",
  startDate,
  endDate,
}) => {
  const [data, setData] = useState<EventTypesAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Wedding");

  // Interactive controls
  const [timelineGranularity, setTimelineGranularity] =
    useState<TimelineGranularity>("daily");
  const [activeTimelineMetrics, setActiveTimelineMetrics] = useState({
    production: true,
    consumption: true,
    waste: true,
  });
  const [hoveredPoint, setHoveredPoint] =
    useState<EventTypeTimelinePoint | null>(null);

  // Dish catalog filter/sort
  const [dishCategoryFilter, setDishCategoryFilter] = useState<string>("all");
  const [dishSearchQuery, setDishSearchQuery] = useState<string>("");
  const [dishSortBy, setDishSortBy] = useState<DishSortMode>("most_consumed");

  useEffect(() => {
    let isMounted = true;
    async function loadEventTypes() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        if (selectedHotel && selectedHotel !== "all")
          query.set("hotel", selectedHotel);
        if (datePreset) query.set("date_preset", datePreset);
        if (startDate) query.set("start_date", startDate);
        if (endDate) query.set("end_date", endDate);

        const res = await apiRequest<EventTypesAnalyticsResponse>(
          `/api/analytics/event-types?${query.toString()}`
        );
        if (isMounted) {
          setData(res);
          // Keep current selection if exists in new response, otherwise select Wedding or first available
          if (res.categories && res.categories.length > 0) {
            const exists = res.categories.some(
              (c) => c.category === selectedCategory
            );
            if (!exists) {
              const weddingCat = res.categories.find(
                (c) => c.category === "Wedding"
              );
              setSelectedCategory(
                weddingCat ? weddingCat.category : res.categories[0].category
              );
            }
          }
        }
      } catch (err: any) {
        if (isMounted)
          setError(err.message || "Failed to load event type analytics");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadEventTypes();
    return () => {
      isMounted = false;
    };
  }, [selectedHotel, datePreset, startDate, endDate]);

  const categories = data?.categories || [];
  const activeCat: EventTypeAnalyticsCategory | undefined =
    categories.find((c) => c.category === selectedCategory) || categories[0];

  // Timeline points based on selected granularity
  const currentTimelinePoints: EventTypeTimelinePoint[] = useMemo(() => {
    if (!activeCat?.timeline_trends) return [];
    if (timelineGranularity === "weekly") {
      return activeCat.timeline_trends.weekly || [];
    }
    if (timelineGranularity === "monthly") {
      return activeCat.timeline_trends.monthly || [];
    }
    return activeCat.timeline_trends.daily || [];
  }, [activeCat, timelineGranularity]);

  // Dish items filtered & sorted
  const processedDishes: DishConsumptionStat[] = useMemo(() => {
    const allDishes = activeCat?.dish_consumption_analysis?.all_dishes || [];
    let filtered = allDishes;

    if (dishCategoryFilter !== "all") {
      filtered = filtered.filter(
        (d) => d.category.toLowerCase() === dishCategoryFilter.toLowerCase()
      );
    }

    if (dishSearchQuery.trim()) {
      const q = dishSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.dish_name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (dishSortBy) {
        case "most_consumed":
          return b.consumed_kg - a.consumed_kg;
        case "least_consumed":
          return a.consumption_rate_pct - b.consumption_rate_pct;
        case "highest_waste":
          return b.waste_kg - a.waste_kg;
        case "highest_loss":
          return b.waste_cost - a.waste_cost;
        case "highest_prep":
          return b.prepared_kg - a.prepared_kg;
        default:
          return 0;
      }
    });

    return sorted;
  }, [activeCat, dishCategoryFilter, dishSearchQuery, dishSortBy]);

  // Dish category unique options
  const dishCategoryOptions = useMemo(() => {
    const cats = new Set<string>();
    (activeCat?.dish_consumption_analysis?.all_dishes || []).forEach((d) => {
      if (d.category) cats.add(d.category);
    });
    return Array.from(cats);
  }, [activeCat]);

  // SVG Line Chart Calculations
  const chartPoints = currentTimelinePoints;
  const svgWidth = 760;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 25;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY * 2;

  const maxVal = useMemo(() => {
    if (!chartPoints.length) return 50;
    let m = 0;
    chartPoints.forEach((pt) => {
      if (activeTimelineMetrics.production && pt.prepared_kg > m)
        m = pt.prepared_kg;
      if (activeTimelineMetrics.consumption && pt.consumed_kg > m)
        m = pt.consumed_kg;
      if (activeTimelineMetrics.waste && pt.waste_kg > m) m = pt.waste_kg;
    });
    return Math.max(m * 1.15, 20);
  }, [chartPoints, activeTimelineMetrics]);

  const getX = (index: number) => {
    if (chartPoints.length <= 1) return svgWidth / 2;
    return paddingX + (index / (chartPoints.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(val, maxVal));
    return paddingY + plotHeight - (clamped / (maxVal || 1)) * plotHeight;
  };

  const createLinePath = (extractor: (p: EventTypeTimelinePoint) => number) => {
    if (chartPoints.length === 0) return "";
    if (chartPoints.length === 1) {
      const cx = svgWidth / 2;
      const cy = getY(extractor(chartPoints[0]));
      return `M ${cx - 30} ${cy} L ${cx + 30} ${cy}`;
    }
    return chartPoints
      .map(
        (pt, idx) =>
          `${idx === 0 ? "M" : "L"} ${getX(idx).toFixed(1)} ${getY(
            extractor(pt)
          ).toFixed(1)}`
      )
      .join(" ");
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-slate-100 rounded-2xl border border-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-slate-100 rounded-2xl border border-slate-200"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-72 bg-slate-100 rounded-2xl border border-slate-200" />
          <div className="h-72 bg-slate-100 rounded-2xl border border-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-3">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
        <div>
          <strong className="block font-bold">Failed to load event type analytics</strong>
          <span>{error || "Unable to establish communication with banquet benchmarks API."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Full Event-Type Waste Intelligence & Dish Comparison Workspace */}
      <EventTypeIntelligenceWorkspace
        initialHotel={selectedHotel}
        initialDatePreset={datePreset}
        isEmbeddedInEventsPage={false}
      />

      {/* Category Selection Tabs & Canonical Header */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 mb-1.5">
              <Tags className="w-3.5 h-3.5 text-emerald-600" />
              Canonical Banquet Event Classifications & Performance Audits
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Event-Type Benchmarks & Culinary Consumption Intelligence
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
              Synced with banquet creation registry. Comparing dish consumption, production volume, and waste patterns across uniform event profiles.
            </p>
          </div>

          <Link
            href="/events/new"
            className="hotel-btn-primary self-start sm:self-center shrink-0 text-xs py-2 px-3.5"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Banquet Event
          </Link>
        </div>

        {/* Uniform Category Tabs (Wedding, Conference, Corporate, Social, Other, Custom) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Select Event Classification:
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isSelected = activeCat?.category === cat.category;
              return (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>{cat.category}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : cat.event_count > 0
                        ? "bg-slate-100 text-slate-700"
                        : "bg-slate-50 text-slate-400"
                    }`}
                  >
                    {cat.event_count} events
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeCat && (
        <div className="space-y-6">
          {/* Active Category Executive Baseline Card */}
          <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
                    {activeCat.category} Performance Baseline
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    ({activeCat.event_count} Verified Banquets)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregation of verified dining shifts recorded under canonical {activeCat.category} classification.
                </p>
              </div>

              {/* Sample Size Warning / Adequate Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  activeCat.sample_size_adequate
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : activeCat.event_count > 0
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "bg-slate-100 text-slate-600 border-slate-300"
                }`}
              >
                {activeCat.sample_size_adequate ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Adequate Sample Size (N = {activeCat.event_count} events)</span>
                  </>
                ) : activeCat.event_count > 0 ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Sample Size Warning (N = {activeCat.event_count}/3 events)</span>
                  </>
                ) : (
                  <>
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    <span>Zero Shifts Logged (N = 0)</span>
                  </>
                )}
              </div>
            </div>

            {/* Audit Note */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 leading-relaxed flex items-center justify-between gap-3">
              <div>
                <strong className="text-slate-800">Audit Rule: </strong>
                {activeCat.sample_size_note}
              </div>
              {activeCat.event_count === 0 && (
                <Link
                  href="/events/new"
                  className="shrink-0 text-emerald-700 hover:text-emerald-800 font-bold underline text-xs"
                >
                  Create {activeCat.category} Event
                </Link>
              )}
            </div>

            {/* Benchmark KPIs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Food Prepared
                </span>
                <span className="text-lg font-serif font-bold text-slate-900 mt-0.5 block">
                  {formatKg(activeCat.total_prepared_kg)}
                </span>
                <span className="text-[10px] text-slate-500">total batch volume</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Food Consumed
                </span>
                <span className="text-lg font-serif font-bold text-emerald-700 mt-0.5 block">
                  {formatKg(activeCat.total_consumed_kg)}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {activeCat.consumption_rate_pct?.toFixed(1) ||
                    (activeCat.total_prepared_kg > 0
                      ? ((activeCat.total_consumed_kg / activeCat.total_prepared_kg) * 100).toFixed(1)
                      : "0.0")}
                  % eaten
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Kitchen Waste
                </span>
                <span className="text-lg font-serif font-bold text-rose-700 mt-0.5 block">
                  {formatKg(activeCat.total_waste_kg)}
                </span>
                <span className="text-[10px] text-rose-600 font-semibold">
                  {activeCat.waste_rate_pct.toFixed(1)}% waste rate
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Waste / Guest
                </span>
                <span className="text-lg font-serif font-bold text-slate-900 mt-0.5 block">
                  {activeCat.waste_per_guest_g.toFixed(0)}g
                </span>
                <span className="text-[10px] text-slate-500">per banquet attendee</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Guests Served
                </span>
                <span className="text-lg font-serif font-bold text-slate-900 mt-0.5 block">
                  {activeCat.total_pax.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">across {activeCat.event_count} banquets</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Financial Loss
                </span>
                <span className="text-lg font-serif font-bold text-slate-900 mt-0.5 block">
                  {formatINR(activeCat.total_waste_cost)}
                </span>
                <span className="text-[10px] text-slate-500">
                  ₹{activeCat.waste_cost_per_guest.toFixed(1)} / guest
                </span>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* DISH CONSUMPTION ANALYSIS: EATEN MORE vs EATEN LESS */}
          {/* ================================================================= */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-emerald-600" />
                  Dish Consumption Intelligence ({activeCat.category})
                </h3>
                <p className="text-xs text-slate-500">
                  Granular audit comparing dishes eaten more (high guest preference) versus dishes eaten less (over-prepared / high waste).
                </p>
              </div>
            </div>

            {/* Side-by-Side Highlight Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Dishes Eaten MORE */}
              <div className="hotel-card p-5 bg-white border border-emerald-200/80 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Flame className="w-4 h-4 text-emerald-600" />
                    </span>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-slate-900">
                        Dishes Eaten More (High Demand & Pickup)
                      </h4>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Highest appetite &gt; 85% consumption rate in {activeCat.category}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Top Demand
                  </span>
                </div>

                {activeCat.dish_consumption_analysis?.most_consumed &&
                activeCat.dish_consumption_analysis.most_consumed.length > 0 ? (
                  <div className="space-y-3">
                    {activeCat.dish_consumption_analysis.most_consumed.slice(0, 5).map((dish, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 hover:border-emerald-200 transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  dish.food_type === "Veg"
                                    ? "bg-emerald-600 ring-2 ring-emerald-200"
                                    : "bg-rose-600 ring-2 ring-rose-200"
                                }`}
                                title={dish.food_type}
                              />
                              <span className="font-bold text-slate-900 text-xs">
                                {dish.dish_name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {dish.category} • {dish.food_type}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold font-mono text-emerald-700 block">
                              {dish.consumption_rate_pct.toFixed(1)}% Eaten
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {formatKg(dish.consumed_kg)} / {formatKg(dish.prepared_kg)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-emerald-200/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, dish.consumption_rate_pct))}%`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Avg Guest Pickup: {dish.consumed_per_guest_g.toFixed(0)}g</span>
                          <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" />
                            Minimal Waste ({dish.waste_rate_pct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 italic">
                    No dish items recorded yet for this category.
                  </div>
                )}
              </div>

              {/* Dishes Eaten LESS */}
              <div className="hotel-card p-5 bg-white border border-rose-200/80 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    </span>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-slate-900">
                        Dishes Eaten Less (Over-Prepared / High Leftover)
                      </h4>
                      <p className="text-[11px] text-rose-700 font-medium">
                        Excess leftovers & low consumption in {activeCat.category}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    Action Required
                  </span>
                </div>

                {activeCat.dish_consumption_analysis?.least_consumed &&
                activeCat.dish_consumption_analysis.least_consumed.length > 0 ? (
                  <div className="space-y-3">
                    {activeCat.dish_consumption_analysis.least_consumed.slice(0, 5).map((dish, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-rose-50/40 border border-rose-100 hover:border-rose-200 transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  dish.food_type === "Veg"
                                    ? "bg-emerald-600 ring-2 ring-emerald-200"
                                    : "bg-rose-600 ring-2 ring-rose-200"
                                }`}
                                title={dish.food_type}
                              />
                              <span className="font-bold text-slate-900 text-xs">
                                {dish.dish_name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {dish.category} • {dish.food_type}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold font-mono text-rose-700 block">
                              {dish.waste_rate_pct.toFixed(1)}% Waste ({formatKg(dish.waste_kg)})
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Loss: {formatINR(dish.waste_cost)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-rose-200/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-600 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, dish.waste_rate_pct))}%`,
                            }}
                          />
                        </div>

                        <div className="p-2 rounded-lg bg-rose-100/60 text-[10px] text-rose-900 font-medium leading-snug">
                          <strong>Kitchen Action: </strong>
                          {dish.recommendation || `Reduce prep batch size by ~${dish.waste_rate_pct.toFixed(0)}%.`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 italic">
                    No dish items recorded yet for this category.
                  </div>
                )}
              </div>
            </div>

            {/* Culinary Course Breakdown (Starters, Mains, Breads, Desserts, Beverages) */}
            {activeCat.dish_consumption_analysis?.dish_categories &&
              activeCat.dish_consumption_analysis.dish_categories.length > 0 && (
                <div className="hotel-card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
                  <h4 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-600" />
                    Culinary Course Breakdown ({activeCat.category})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {activeCat.dish_consumption_analysis.dish_categories.map((cBreak, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{cBreak.category}</span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {cBreak.dish_count} items
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 text-[11px]">
                          <span>Consumed:</span>
                          <strong className="text-emerald-700">
                            {cBreak.consumption_rate_pct.toFixed(1)}%
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 text-[11px]">
                          <span>Waste:</span>
                          <strong className="text-rose-700 font-mono">
                            {formatKg(cBreak.waste_kg)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 text-[11px]">
                          <span>Loss:</span>
                          <strong className="text-slate-900 font-mono">
                            {formatINR(cBreak.waste_cost)}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Searchable & Sortable Dish Catalog Table */}
            <div className="hotel-card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-serif text-sm font-bold text-slate-900">
                    Comprehensive Dish Consumption Catalog ({activeCat.category})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Search and sort recipe preparation volumes, consumption ratios, and leftover costs
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search dish..."
                      value={dishSearchQuery}
                      onChange={(e) => setDishSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-slate-900 w-36 sm:w-44"
                    />
                  </div>

                  {/* Course Filter */}
                  <select
                    value={dishCategoryFilter}
                    onChange={(e) => setDishCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">All Courses</option>
                    {dishCategoryOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  {/* Sort By */}
                  <select
                    value={dishSortBy}
                    onChange={(e) => setDishSortBy(e.target.value as DishSortMode)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="most_consumed">Most Consumed (Eaten More)</option>
                    <option value="least_consumed">Least Consumed (Eaten Less)</option>
                    <option value="highest_waste">Highest Waste (kg)</option>
                    <option value="highest_loss">Highest Financial Loss (₹)</option>
                    <option value="highest_prep">Highest Prepared (kg)</option>
                  </select>
                </div>
              </div>

              {processedDishes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70 font-semibold">
                        <th className="py-2.5 px-3">Dish Item</th>
                        <th className="py-2.5 px-3">Course</th>
                        <th className="py-2.5 px-3 text-right">Prepared (kg)</th>
                        <th className="py-2.5 px-3 text-right">Consumed (kg)</th>
                        <th className="py-2.5 px-3 text-right">Eaten %</th>
                        <th className="py-2.5 px-3 text-right">Waste (kg)</th>
                        <th className="py-2.5 px-3 text-right">Waste %</th>
                        <th className="py-2.5 px-3 text-right">Loss (₹)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3">Chef Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {processedDishes.map((dish, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  dish.food_type === "Veg"
                                    ? "bg-emerald-600"
                                    : "bg-rose-600"
                                }`}
                                title={dish.food_type}
                              />
                              <span>{dish.dish_name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{dish.category}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                            {formatKg(dish.prepared_kg)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                            {formatKg(dish.consumed_kg)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                            {dish.consumption_rate_pct.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">
                            {formatKg(dish.waste_kg)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">
                            {dish.waste_rate_pct.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                            {formatINR(dish.waste_cost)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                dish.consumption_rate_pct >= 85
                                  ? "bg-emerald-100 text-emerald-800"
                                  : dish.consumption_rate_pct >= 65
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {dish.popularity_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-xs">
                            {dish.recommendation || "Maintain balanced batch"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  No dishes match the selected filter.
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* DAY-WISE ANALYSIS (DAY OF THE WEEK VARIATIONS) */}
          {/* ================================================================= */}
          {activeCat.day_of_week_trends && activeCat.day_of_week_trends.length > 0 && (
            <div className="hotel-card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-serif text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Day-Wise Dining &amp; Waste Analysis ({activeCat.category})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Day-of-the-week pattern tracking guest appetites, attendance peaks, and leftover ratios
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                  Monday - Sunday Variations
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {activeCat.day_of_week_trends.map((dow) => {
                  const hasData = dow.prepared_kg > 0;
                  return (
                    <div
                      key={dow.day}
                      className={`p-3 rounded-xl border transition-all ${
                        hasData
                          ? "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                          : "bg-slate-50/30 border-dashed border-slate-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-800">{dow.day}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
                          {dow.event_count} ev
                        </span>
                      </div>

                      {hasData ? (
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Avg Pax:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {dow.avg_pax}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Cooked:</span>
                            <span className="font-mono text-slate-800">{formatKg(dow.prepared_kg)}</span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-700">
                            <span>Eaten:</span>
                            <span className="font-mono font-bold">{dow.consumption_rate_pct.toFixed(0)}%</span>
                          </div>
                          <div className="flex items-center justify-between text-rose-700">
                            <span>Waste:</span>
                            <span className="font-mono font-bold">{formatKg(dow.waste_kg)}</span>
                          </div>
                          {/* Mini Progress */}
                          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${Math.min(100, dow.consumption_rate_pct)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-[10px] text-slate-400 italic">
                          No shifts
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TIMELINE TRENDS WITH INTERACTIVE SVG LINE GRAPH */}
          {/* ================================================================= */}
          {chartPoints.length > 0 && (
            <div className="hotel-card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-serif text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    {activeCat.category} Volume &amp; Waste Timeline Trends
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Interactive line graph displaying prepared food, guest consumption, and kitchen leftovers over time
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Granularity Switcher: Daily / Weekly / Monthly */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      onClick={() => setTimelineGranularity("daily")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        timelineGranularity === "daily"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Day-Wise
                    </button>
                    <button
                      onClick={() => setTimelineGranularity("weekly")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        timelineGranularity === "weekly"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setTimelineGranularity("monthly")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        timelineGranularity === "monthly"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Monthly
                    </button>
                  </div>

                  {/* Metric Visibility Toggles */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      onClick={() =>
                        setActiveTimelineMetrics((m) => ({
                          ...m,
                          production: !m.production,
                        }))
                      }
                      className={`px-2 py-1 rounded-lg font-semibold border transition-all ${
                        activeTimelineMetrics.production
                          ? "bg-blue-50 text-blue-800 border-blue-300 font-bold"
                          : "bg-white text-slate-400 border-slate-200 line-through"
                      }`}
                    >
                      Cooked
                    </button>
                    <button
                      onClick={() =>
                        setActiveTimelineMetrics((m) => ({
                          ...m,
                          consumption: !m.consumption,
                        }))
                      }
                      className={`px-2 py-1 rounded-lg font-semibold border transition-all ${
                        activeTimelineMetrics.consumption
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                          : "bg-white text-slate-400 border-slate-200 line-through"
                      }`}
                    >
                      Consumed
                    </button>
                    <button
                      onClick={() =>
                        setActiveTimelineMetrics((m) => ({
                          ...m,
                          waste: !m.waste,
                        }))
                      }
                      className={`px-2 py-1 rounded-lg font-semibold border transition-all ${
                        activeTimelineMetrics.waste
                          ? "bg-rose-50 text-rose-800 border-rose-300 font-bold"
                          : "bg-white text-slate-400 border-slate-200 line-through"
                      }`}
                    >
                      Waste
                    </button>
                  </div>
                </div>
              </div>

              {/* SVG Line Graph */}
              <div className="w-full overflow-x-auto">
                <div className="min-w-[680px]">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-auto"
                  >
                    {/* Background Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                      const y = paddingY + plotHeight * pct;
                      const valLabel = (maxVal * (1 - pct)).toFixed(0);
                      return (
                        <g key={idx}>
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={svgWidth - paddingX}
                            y2={y}
                            stroke="#f1f5f9"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={paddingX - 8}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="#94a3b8"
                            fontFamily="monospace"
                          >
                            {valLabel} kg
                          </text>
                        </g>
                      );
                    })}

                    {/* Production Line (Blue) */}
                    {activeTimelineMetrics.production && (
                      <path
                        d={createLinePath((p) => p.prepared_kg)}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Consumption Line (Emerald) */}
                    {activeTimelineMetrics.consumption && (
                      <path
                        d={createLinePath((p) => p.consumed_kg)}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Waste Line (Rose) */}
                    {activeTimelineMetrics.waste && (
                      <path
                        d={createLinePath((p) => p.waste_kg)}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data Points */}
                    {chartPoints.map((pt, idx) => {
                      const cx = getX(idx);
                      const cyProd = getY(pt.prepared_kg);
                      const cyCons = getY(pt.consumed_kg);
                      const cyWaste = getY(pt.waste_kg);

                      return (
                        <g key={idx}>
                          {/* Vertical guide line on hover */}
                          {hoveredPoint?.label === pt.label && (
                            <line
                              x1={cx}
                              y1={paddingY}
                              x2={cx}
                              y2={paddingY + plotHeight}
                              stroke="#cbd5e1"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          )}

                          {activeTimelineMetrics.production && (
                            <circle
                              cx={cx}
                              cy={cyProd}
                              r={hoveredPoint?.label === pt.label ? "5" : "3.5"}
                              fill="#3b82f6"
                              stroke="#ffffff"
                              strokeWidth="2"
                              className="cursor-pointer transition-all"
                              onMouseEnter={() => setHoveredPoint(pt)}
                            />
                          )}

                          {activeTimelineMetrics.consumption && (
                            <circle
                              cx={cx}
                              cy={cyCons}
                              r={hoveredPoint?.label === pt.label ? "5" : "3.5"}
                              fill="#10b981"
                              stroke="#ffffff"
                              strokeWidth="2"
                              className="cursor-pointer transition-all"
                              onMouseEnter={() => setHoveredPoint(pt)}
                            />
                          )}

                          {activeTimelineMetrics.waste && (
                            <circle
                              cx={cx}
                              cy={cyWaste}
                              r={hoveredPoint?.label === pt.label ? "5" : "3.5"}
                              fill="#f43f5e"
                              stroke="#ffffff"
                              strokeWidth="2"
                              className="cursor-pointer transition-all"
                              onMouseEnter={() => setHoveredPoint(pt)}
                            />
                          )}

                          {/* X-axis Label */}
                          <text
                            x={cx}
                            y={svgHeight - 6}
                            textAnchor="middle"
                            fontSize="9"
                            fill="#64748b"
                            fontFamily="monospace"
                          >
                            {pt.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Tooltip / Details Callout */}
              {hoveredPoint ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                  <div>
                    <span className="font-bold text-slate-800">
                      Timeline Point: {hoveredPoint.label}
                    </span>
                    <span className="text-slate-500 ml-2">
                      ({hoveredPoint.pax} Guests Served)
                    </span>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-blue-700">
                      Prepared: <strong>{formatKg(hoveredPoint.prepared_kg)}</strong>
                    </span>
                    <span className="text-emerald-700">
                      Consumed: <strong>{formatKg(hoveredPoint.consumed_kg)}</strong> (
                      {hoveredPoint.consumption_rate_pct.toFixed(0)}%)
                    </span>
                    <span className="text-rose-700">
                      Waste: <strong>{formatKg(hoveredPoint.waste_kg)}</strong> (
                      {hoveredPoint.waste_rate_pct.toFixed(0)}%)
                    </span>
                    <span className="text-slate-800">
                      Loss: <strong>{formatINR(hoveredPoint.waste_cost)}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 text-center italic">
                  Hover over any data dot on the chart to view itemized volume and financial loss metrics.
                </div>
              )}
            </div>
          )}

          {/* Subtypes Breakdown (if any) */}
          {activeCat.subtypes && activeCat.subtypes.length > 0 && (
            <div className="hotel-card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
              <h4 className="font-serif text-sm font-bold text-slate-900">
                Subtype Breakdown ({activeCat.category})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {activeCat.subtypes.map((st) => (
                  <div
                    key={st.subtype}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{st.subtype}</span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {st.record_count} records
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Waste Rate:</span>
                      <strong className="text-slate-900">{st.waste_rate_pct.toFixed(1)}%</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Waste / Guest:</span>
                      <strong className="text-slate-900">{st.waste_per_guest_g.toFixed(0)}g</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Financial Loss:</span>
                      <strong className="text-slate-900">{formatINR(st.waste_cost)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itemized Events in this Category Table */}
          <div className="hotel-card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif text-sm sm:text-base font-bold text-slate-900">
                  Like-for-Like Event Registry &amp; Comparison ({activeCat.category})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Individual banquets compared strictly against the empirical category baseline
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {activeCat.events.length} Banquet Events
              </span>
            </div>

            {activeCat.events.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70 font-semibold">
                      <th className="py-2.5 px-3">Event Name</th>
                      <th className="py-2.5 px-3">Hotel</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Guests (Pax)</th>
                      <th className="py-2.5 px-3 text-right">Cooked (kg)</th>
                      <th className="py-2.5 px-3 text-right">Eaten (kg)</th>
                      <th className="py-2.5 px-3 text-right">Waste (kg)</th>
                      <th className="py-2.5 px-3 text-right">Waste %</th>
                      <th className="py-2.5 px-3 text-right">Waste / Guest</th>
                      <th className="py-2.5 px-3 text-right">Loss (₹)</th>
                      <th className="py-2.5 px-3 text-center">vs Category Benchmark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeCat.events.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{ev.event_name}</div>
                          <div className="text-[11px] text-slate-500">{ev.subtype}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{ev.hotel_name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{ev.date}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">{ev.pax}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                          {formatKg(ev.prepared_kg)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                          {formatKg(ev.consumed_kg)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">
                          {formatKg(ev.waste_kg)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {ev.waste_rate_pct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                          {ev.waste_per_guest_g.toFixed(0)}g
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                          {formatINR(ev.waste_cost)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {ev.compared_to_benchmark !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ev.compared_to_benchmark <= 0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {ev.compared_to_benchmark > 0 ? "+" : ""}
                              {ev.compared_to_benchmark.toFixed(1)}% pts
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Insufficient Baseline
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No events currently recorded under this classification.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
