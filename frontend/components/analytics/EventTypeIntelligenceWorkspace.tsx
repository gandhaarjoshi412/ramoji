"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import {
  EventTypesAnalyticsResponse,
  EventTypeAnalyticsCategory,
  DishComparisonMatrixItem,
  GroupedDishChartItem,
  WastePerGuestChartItem,
  FinancialImpactChartItem,
  DishHeatmapRow,
  DataQualityAuditSummary,
  ManagementInsight,
} from "@/types/analytics";
import {
  UtensilsCrossed,
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Briefcase,
  Heart,
  PartyPopper,
  Mic,
  Building2,
  Info,
  ArrowRight,
  Flame,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  BarChart3,
  Layers,
  ShieldAlert,
  Calendar,
  Eye,
  RefreshCw,
  Plus,
} from "lucide-react";

interface EventTypeIntelligenceWorkspaceProps {
  initialHotel?: string;
  initialDatePreset?: string;
  isEmbeddedInEventsPage?: boolean;
}

type PriorityFilter = "All" | "Critical" | "Attention" | "Performing Well" | "Information";
type ChartUnit = "kg" | "pct";
type ActiveViewTab = "matrix" | "cards" | "charts" | "profiles" | "integrity";

export const EventTypeIntelligenceWorkspace: React.FC<EventTypeIntelligenceWorkspaceProps> = ({
  initialHotel = "all",
  initialDatePreset = "all",
  isEmbeddedInEventsPage = false,
}) => {
  const [data, setData] = useState<EventTypesAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedHotel, setSelectedHotel] = useState<string>(initialHotel);
  const [datePreset, setDatePreset] = useState<string>(initialDatePreset);
  const [selectedCategory, setSelectedCategory] = useState<string>("Corporate");
  const [dishSearchQuery, setDishSearchQuery] = useState<string>("");
  const [dishCategoryFilter, setDishCategoryFilter] = useState<string>("all");
  const [dietaryFilter, setDietaryFilter] = useState<string>("all");
  const [wasteRateFilter, setWasteRateFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");
  const [chartUnit, setChartUnit] = useState<ChartUnit>("kg");
  const [activeViewTab, setActiveViewTab] = useState<ActiveViewTab>("matrix");
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState<boolean>(true);

  // Matrix sorting
  const [matrixSortCol, setMatrixSortCol] = useState<string>("waste_kg");
  const [matrixSortAsc, setMatrixSortAsc] = useState<boolean>(false);

  // Fetch from unified backend endpoint
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedHotel && selectedHotel !== "all") params.append("hotel", selectedHotel);
      if (datePreset && datePreset !== "all") params.append("date_preset", datePreset);
      if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);

      const res = await apiRequest<EventTypesAnalyticsResponse>(
        `/api/analytics/event-types?${params.toString()}`
      );
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load event type intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialHotel !== undefined) {
      setSelectedHotel(initialHotel);
    }
  }, [initialHotel]);

  useEffect(() => {
    if (initialDatePreset !== undefined) {
      setDatePreset(initialDatePreset);
    }
  }, [initialDatePreset]);

  useEffect(() => {
    fetchData();
  }, [selectedHotel, datePreset]);

  // Extract unique categories and counts from the dish comparison matrix
  const dishCategoryOptions = useMemo(() => {
    if (!data?.dish_comparison_matrix) return [];
    const counts: Record<string, number> = {};
    data.dish_comparison_matrix.forEach((d) => {
      const cat = d.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  // Active Category Data
  const activeCategorySummary = useMemo<EventTypeAnalyticsCategory | null>(() => {
    if (!data?.categories) return null;
    return (
      data.categories.find(
        (c) => c.category.toLowerCase() === selectedCategory.toLowerCase()
      ) ||
      data.categories[0] ||
      null
    );
  }, [data, selectedCategory]);

  // Operational Intelligence Insights
  const filteredInsights = useMemo<ManagementInsight[]>(() => {
    const list = data?.operational_intelligence?.insights || [];
    if (priorityFilter === "All") return list;
    return list.filter((i) => i.priority === priorityFilter);
  }, [data, priorityFilter]);

  // Filtered & Sorted Dish Comparison Matrix
  const filteredDishMatrix = useMemo<DishComparisonMatrixItem[]>(() => {
    if (!data?.dish_comparison_matrix) return [];
    let list = [...data.dish_comparison_matrix];

    if (dishSearchQuery.trim()) {
      const q = dishSearchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.dish_name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.matched_aliases.some((a) => a.toLowerCase().includes(q))
      );
    }

    if (dishCategoryFilter !== "all") {
      list = list.filter((d) => d.category.toLowerCase() === dishCategoryFilter.toLowerCase());
    }

    if (dietaryFilter !== "all") {
      list = list.filter((d) => (d.food_type || "").toLowerCase() === dietaryFilter.toLowerCase());
    }

    if (wasteRateFilter === "high") {
      list = list.filter((d) => {
        const rate = d.total_prepared_kg > 0 ? (d.total_waste_kg / d.total_prepared_kg) * 100 : 0;
        return rate >= 10;
      });
    } else if (wasteRateFilter === "medium") {
      list = list.filter((d) => {
        const rate = d.total_prepared_kg > 0 ? (d.total_waste_kg / d.total_prepared_kg) * 100 : 0;
        return rate >= 5 && rate < 10;
      });
    } else if (wasteRateFilter === "low") {
      list = list.filter((d) => {
        const rate = d.total_prepared_kg > 0 ? (d.total_waste_kg / d.total_prepared_kg) * 100 : 0;
        return rate < 5;
      });
    }

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (matrixSortCol === "dish_name") {
        return matrixSortAsc
          ? a.dish_name.localeCompare(b.dish_name)
          : b.dish_name.localeCompare(a.dish_name);
      } else if (matrixSortCol === "prepared_kg") {
        valA = a.total_prepared_kg;
        valB = b.total_prepared_kg;
      } else if (matrixSortCol === "waste_kg") {
        valA = a.total_waste_kg;
        valB = b.total_waste_kg;
      } else if (matrixSortCol === "waste_cost") {
        valA = a.total_waste_cost;
        valB = b.total_waste_cost;
      } else if (matrixSortCol === "active_cat_waste_pct") {
        valA = a.categories[selectedCategory]?.waste_rate_pct || 0;
        valB = b.categories[selectedCategory]?.waste_rate_pct || 0;
      }
      return matrixSortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [data, dishSearchQuery, dishCategoryFilter, dietaryFilter, wasteRateFilter, matrixSortCol, matrixSortAsc, selectedCategory]);

  // Matrix Pagination
  const [matrixPage, setMatrixPage] = useState<number>(1);
  const [matrixPerPage, setMatrixPerPage] = useState<number>(10);

  // Cards Pagination
  const [cardsPage, setCardsPage] = useState<number>(1);
  const cardsPerPage = 12;

  useEffect(() => {
    setMatrixPage(1);
    setCardsPage(1);
  }, [dishSearchQuery, dishCategoryFilter, dietaryFilter, wasteRateFilter, matrixSortCol, matrixSortAsc, selectedCategory]);

  const totalMatrixPages = Math.max(1, Math.ceil(filteredDishMatrix.length / matrixPerPage));
  const paginatedDishMatrix = useMemo(() => {
    const start = (matrixPage - 1) * matrixPerPage;
    return filteredDishMatrix.slice(start, start + matrixPerPage);
  }, [filteredDishMatrix, matrixPage, matrixPerPage]);

  const totalCardsPages = Math.max(1, Math.ceil(filteredDishMatrix.length / cardsPerPage));
  const paginatedCardsMatrix = useMemo(() => {
    const start = (cardsPage - 1) * cardsPerPage;
    return filteredDishMatrix.slice(start, start + cardsPerPage);
  }, [filteredDishMatrix, cardsPage, cardsPerPage]);

  const toggleSort = (col: string) => {
    if (matrixSortCol === col) {
      setMatrixSortAsc(!matrixSortAsc);
    } else {
      setMatrixSortCol(col);
      setMatrixSortAsc(false);
    }
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case "Critical":
        return {
          icon: <Flame className="w-3.5 h-3.5 text-rose-600" />,
          badge: "bg-rose-100 text-rose-800 border-rose-200",
          cardBorder: "border-rose-200/90 bg-rose-50/20",
          titleColor: "text-rose-950",
        };
      case "Attention":
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          badge: "bg-amber-100 text-amber-800 border-amber-200",
          cardBorder: "border-amber-200/90 bg-amber-50/20",
          titleColor: "text-amber-950",
        };
      case "Performing Well":
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
          cardBorder: "border-emerald-200/90 bg-emerald-50/20",
          titleColor: "text-emerald-950",
        };
      default:
        return {
          icon: <Info className="w-3.5 h-3.5 text-blue-600" />,
          badge: "bg-blue-100 text-blue-800 border-blue-200",
          cardBorder: "border-blue-200/90 bg-blue-50/20",
          titleColor: "text-blue-950",
        };
    }
  };

  const canonicalCategories = ["Corporate", "Social", "Wedding", "Conference", "Custom"];

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/80 mb-2">
            <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-600" />
            Empirical Culinary Intelligence
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Event-Type Waste Intelligence & Dish Comparison
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Data-driven comparison of food preparation, patron consumption, dish-level discards, and procurement losses across Corporate, Social, Wedding, Conference, and Custom banquet events.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Intelligence Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsWorkspaceExpanded(!isWorkspaceExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
          >
            {isWorkspaceExpanded ? (
              <>
                <span>Collapse Workspace</span>
                <ChevronUp className="w-4 h-4 text-slate-500" />
              </>
            ) : (
              <>
                <span>Expand Workspace</span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </>
            )}
          </button>
        </div>
      </div>

      {isWorkspaceExpanded && (
        <div className="space-y-6">
          {/* Controls: Category Selector & Filters */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Select Event Category:
                </span>
                <div className="flex flex-wrap gap-2">
                  {canonicalCategories.map((cat) => {
                    const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                    const catSummary = data?.categories.find(
                      (c) => c.category.toLowerCase() === cat.toLowerCase()
                    );
                    const eventCount = catSummary?.event_count || 0;

                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <span>{cat}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : eventCount > 0
                              ? "bg-slate-100 text-slate-700"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {eventCount} {eventCount === 1 ? "event" : "events"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scope & Date Filters */}
              <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Hotel Scope
                  </span>
                  <select
                    value={selectedHotel}
                    onChange={(e) => setSelectedHotel(e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-slate-900 shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Hotels (Consolidated)</option>
                    <option value="Hotel Sitara">Hotel Sitara</option>
                    <option value="Hotel Tara">Hotel Tara</option>
                    <option value="Hotel Sahara">Hotel Sahara</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Date Range
                  </span>
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-slate-900 shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Historic Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last_7">Last 7 Days</option>
                    <option value="last_30">Last 30 Days</option>
                    <option value="this_month">This Month</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5.2: Executive Briefing Banner */}
          {activeCategorySummary && (
            <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                      Executive Briefing & Baseline Performance
                    </span>
                    <h3 className="font-serif text-lg font-bold text-white tracking-tight">
                      {selectedCategory} Banquets Overview
                    </h3>
                  </div>
                </div>

                {/* Sample Size Warning / Adequate Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto ${
                    activeCategorySummary.sample_size_adequate
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
                      : activeCategorySummary.event_count > 0
                      ? "bg-amber-950/80 text-amber-300 border-amber-700"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {activeCategorySummary.sample_size_adequate ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Empirical Baseline Verified (N = {activeCategorySummary.event_count} events)</span>
                    </>
                  ) : activeCategorySummary.event_count > 0 ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sample Size Notice (N = {activeCategorySummary.event_count}/3 events)</span>
                    </>
                  ) : (
                    <>
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      <span>Zero Shifts Logged in Scope (N = 0)</span>
                    </>
                  )}
                </div>
              </div>

              {/* Briefing Narrative */}
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                {activeCategorySummary.event_count > 0
                  ? `Across ${activeCategorySummary.event_count} banquet events (${activeCategorySummary.total_records} dish line-items), operations prepared ${formatKg(
                      activeCategorySummary.total_prepared_kg
                    )} and served ${activeCategorySummary.total_pax.toLocaleString()} guests. Final waste recorded at ${formatKg(
                      activeCategorySummary.total_waste_kg
                    )} (${activeCategorySummary.waste_rate_pct.toFixed(
                      1
                    )}% waste rate), resulting in ${activeCategorySummary.waste_per_guest_g.toFixed(
                      0
                    )}g/guest discard rate and ${formatINR(
                      activeCategorySummary.total_waste_cost
                    )} direct procurement loss.`
                  : `No recorded dining services exist under ${selectedCategory} for the current filter scope. Create a new event or import spreadsheet logs to build an empirical comparison baseline.`}
              </p>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Banquets Analyzed
                  </span>
                  <span className="text-lg font-serif font-bold text-white mt-0.5 block">
                    {activeCategorySummary.event_count}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {activeCategorySummary.total_records} line-items
                  </span>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Guests Served
                  </span>
                  <span className="text-lg font-serif font-bold text-white mt-0.5 block">
                    {activeCategorySummary.total_pax.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400">total attendee covers</span>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Food Prepared
                  </span>
                  <span className="text-lg font-serif font-bold text-white mt-0.5 block">
                    {formatKg(activeCategorySummary.total_prepared_kg)}
                  </span>
                  <span className="text-[10px] text-slate-400">production volume</span>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Kitchen Discards
                  </span>
                  <span className="text-lg font-serif font-bold text-rose-400 mt-0.5 block">
                    {formatKg(activeCategorySummary.total_waste_kg)}
                  </span>
                  <span className="text-[10px] text-rose-300 font-semibold">
                    {activeCategorySummary.waste_rate_pct.toFixed(1)}% waste rate
                  </span>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Waste / Guest
                  </span>
                  <span className="text-lg font-serif font-bold text-amber-300 mt-0.5 block">
                    {activeCategorySummary.waste_per_guest_g.toFixed(0)}g
                  </span>
                  <span className="text-[10px] text-slate-400">per attendee</span>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Procurement Loss
                  </span>
                  <span className="text-lg font-serif font-bold text-white mt-0.5 block">
                    {formatINR(activeCategorySummary.total_waste_cost)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatINR(activeCategorySummary.waste_cost_per_guest)} / guest
                  </span>
                </div>
              </div>

              {/* Sample Size Audit Note */}
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between gap-3">
                <div>
                  <strong className="text-slate-100">Methodology & Baseline Rule: </strong>
                  {activeCategorySummary.sample_size_note}
                </div>
                {activeCategorySummary.event_count === 0 && (
                  <Link
                    href={`/events/new?type=${encodeURIComponent(selectedCategory)}`}
                    className="shrink-0 text-emerald-400 hover:text-emerald-300 font-bold underline text-xs"
                  >
                    Create {selectedCategory} Event
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* View Mode Subtab Switcher & Interactive Filter Toolbar */}
          <div className="space-y-3 border-b border-slate-200/80 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setActiveViewTab("matrix")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    activeViewTab === "matrix"
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Dish Comparison Matrix</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                    {filteredDishMatrix.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveViewTab("cards")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    activeViewTab === "cards"
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>Visual Food Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveViewTab("charts")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    activeViewTab === "charts"
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Analytical Charts Suite</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveViewTab("profiles")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    activeViewTab === "profiles"
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Audience Behavioral Profiles</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveViewTab("integrity")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    activeViewTab === "integrity"
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Data Integrity & Audit</span>
                  {data?.data_quality_audit && data.data_quality_audit.flagged_records_count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                      {data.data_quality_audit.flagged_records_count}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filter, Search & Dropdown Menus Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="flex flex-wrap items-center gap-2.5 w-full">
                {/* Dish Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search dish (e.g. Rice, Paneer, Naan)..."
                    value={dishSearchQuery}
                    onChange={(e) => setDishSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                  />
                </div>

                {/* Dropdown Menu: Dish Course / Category Filter */}
                <div className="relative">
                  <select
                    value={dishCategoryFilter}
                    onChange={(e) => setDishCategoryFilter(e.target.value)}
                    title="Filter by Dish Category"
                    aria-label="Filter by Dish Category"
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs cursor-pointer"
                  >
                    <option value="all">
                      All Categories ({data?.dish_comparison_matrix?.length || 0})
                    </option>
                    {dishCategoryOptions.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.name} ({opt.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dropdown Menu: Sort Ordering */}
                <div className="relative">
                  <select
                    value={matrixSortCol}
                    onChange={(e) => {
                      setMatrixSortCol(e.target.value);
                      setMatrixSortAsc(e.target.value === "dish_name");
                    }}
                    title="Sort dishes"
                    aria-label="Sort dishes"
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs cursor-pointer"
                  >
                    <option value="waste_kg">Sort: Highest Waste (kg) ↓</option>
                    <option value="waste_cost">Sort: Financial Loss (₹) ↓</option>
                    <option value="prepared_kg">Sort: Total Prepared (kg) ↓</option>
                    <option value="dish_name">Sort: Dish Name (A-Z)</option>
                    <option value="active_cat_waste_pct">Sort: {selectedCategory} Waste % ↓</option>
                  </select>
                </div>

                {/* Dropdown Menu: Dietary / Food Type */}
                <div className="relative">
                  <select
                    value={dietaryFilter}
                    onChange={(e) => setDietaryFilter(e.target.value)}
                    title="Filter by dietary type"
                    aria-label="Filter by dietary type"
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Food Types</option>
                    <option value="Veg">Vegetarian Only</option>
                    <option value="Non-Veg">Non-Vegetarian Only</option>
                  </select>
                </div>

                {/* Dropdown Menu: Discard / Waste Rate Threshold */}
                <div className="relative">
                  <select
                    value={wasteRateFilter}
                    onChange={(e) => setWasteRateFilter(e.target.value)}
                    title="Filter by discard level"
                    aria-label="Filter by discard level"
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Discard Levels</option>
                    <option value="high">High Discard (≥ 10%)</option>
                    <option value="medium">Moderate Discard (5% - 10%)</option>
                    <option value="low">Controlled / Low (&lt; 5%)</option>
                  </select>
                </div>

                {/* Reset Filters Shortcut Button */}
                {(dishSearchQuery || dishCategoryFilter !== "all" || dietaryFilter !== "all" || wasteRateFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setDishSearchQuery("");
                      setDishCategoryFilter("all");
                      setDietaryFilter("all");
                      setWasteRateFilter("all");
                    }}
                    className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg font-bold transition-colors cursor-pointer ml-auto sm:ml-0"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
              VIEW 1: DISH COMPARISON MATRIX TABLE (SECTION 6.3)
             ========================================================================= */}
          {activeViewTab === "matrix" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  Showing {filteredDishMatrix.length} dishes comparing performance across Corporate, Social, Wedding, Conference, and Custom events.
                </span>
                <span className="text-[11px] text-slate-400">
                  Click column headers to sort. Expand aliases to audit spreadsheet source mappings.
                </span>
              </div>

              <div className="hotel-card overflow-hidden bg-white border border-slate-200/90 rounded-2xl shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                      <tr>
                        <th
                          className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                          onClick={() => toggleSort("dish_name")}
                        >
                          Dish & Category {matrixSortCol === "dish_name" && (matrixSortAsc ? "↑" : "↓")}
                        </th>
                        <th
                          className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
                          onClick={() => toggleSort("prepared_kg")}
                        >
                          Total Prep (kg) {matrixSortCol === "prepared_kg" && (matrixSortAsc ? "↑" : "↓")}
                        </th>
                        <th
                          className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
                          onClick={() => toggleSort("waste_kg")}
                        >
                          Total Waste (kg) {matrixSortCol === "waste_kg" && (matrixSortAsc ? "↑" : "↓")}
                        </th>
                        <th className="py-3 px-3 text-center bg-blue-50/50 text-blue-900">
                          Corporate Waste %
                        </th>
                        <th className="py-3 px-3 text-center bg-rose-50/50 text-rose-900">
                          Wedding Waste %
                        </th>
                        <th className="py-3 px-3 text-center bg-amber-50/50 text-amber-900">
                          Social Waste %
                        </th>
                        <th className="py-3 px-3 text-center bg-purple-50/50 text-purple-900">
                          Conference Waste %
                        </th>
                        <th className="py-3 px-3 text-center bg-emerald-50/50 text-emerald-900">
                          Custom Waste %
                        </th>
                        <th
                          className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
                          onClick={() => toggleSort("waste_cost")}
                        >
                          Loss (₹) {matrixSortCol === "waste_cost" && (matrixSortAsc ? "↑" : "↓")}
                        </th>
                        <th className="py-3 px-4">Actionable Kitchen Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredDishMatrix.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400">
                            No dishes found matching your search.
                          </td>
                        </tr>
                      ) : (
                        paginatedDishMatrix.map((dish) => {
                          const corp = dish.categories["Corporate"];
                          const wed = dish.categories["Wedding"];
                          const soc = dish.categories["Social"];
                          const conf = dish.categories["Conference"];
                          const cust = dish.categories["Custom"];

                          return (
                            <tr key={dish.dish_name} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900">{dish.dish_name}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span className="px-1.5 py-0.2 rounded-md bg-slate-100 font-semibold text-slate-600">
                                    {dish.category}
                                  </span>
                                  {dish.matched_aliases.length > 1 && (
                                    <span title={`Matched spreadsheet names: ${dish.matched_aliases.join(", ")}`}>
                                      • {dish.matched_aliases.length} source aliases
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-right text-slate-700">
                                {formatKg(dish.total_prepared_kg)}
                              </td>
                              <td className="py-3.5 px-3 text-right font-bold text-rose-600">
                                {formatKg(dish.total_waste_kg)}
                              </td>
                              {/* Corporate */}
                              <td className="py-3.5 px-3 text-center">
                                {corp && corp.records_count > 0 ? (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                                      corp.waste_rate_pct >= 40
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : corp.waste_rate_pct >= 20
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    }`}
                                  >
                                    {corp.waste_rate_pct.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                              {/* Wedding */}
                              <td className="py-3.5 px-3 text-center">
                                {wed && wed.records_count > 0 ? (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                                      wed.waste_rate_pct >= 40
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : wed.waste_rate_pct >= 20
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    }`}
                                  >
                                    {wed.waste_rate_pct.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                              {/* Social */}
                              <td className="py-3.5 px-3 text-center">
                                {soc && soc.records_count > 0 ? (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                                      soc.waste_rate_pct >= 40
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : soc.waste_rate_pct >= 20
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    }`}
                                  >
                                    {soc.waste_rate_pct.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                              {/* Conference */}
                              <td className="py-3.5 px-3 text-center">
                                {conf && conf.records_count > 0 ? (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                                      conf.waste_rate_pct >= 40
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : conf.waste_rate_pct >= 20
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    }`}
                                  >
                                    {conf.waste_rate_pct.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                              {/* Custom */}
                              <td className="py-3.5 px-3 text-center">
                                {cust && cust.records_count > 0 ? (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                                      cust.waste_rate_pct >= 40
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : cust.waste_rate_pct >= 20
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    }`}
                                  >
                                    {cust.waste_rate_pct.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                                {formatINR(dish.total_waste_cost)}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-600 leading-relaxed max-w-xs">
                                <span className="font-semibold text-slate-800">{dish.recommendation}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Dish Comparison Matrix Pagination Controls */}
                {filteredDishMatrix.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>
                        Showing <strong>{(matrixPage - 1) * matrixPerPage + 1}</strong> to{" "}
                        <strong>{Math.min(matrixPage * matrixPerPage, filteredDishMatrix.length)}</strong> of{" "}
                        <strong>{filteredDishMatrix.length}</strong> dishes
                      </span>
                      <span className="text-slate-300">|</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Per page:</span>
                        <select
                          value={matrixPerPage}
                          onChange={(e) => {
                            setMatrixPerPage(Number(e.target.value));
                            setMatrixPage(1);
                          }}
                          className="px-2 py-0.5 border border-slate-200 rounded-md bg-white text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={matrixPage <= 1}
                        onClick={() => setMatrixPage((prev) => Math.max(1, prev - 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>

                      {Array.from({ length: totalMatrixPages }, (_, i) => i + 1).map((pg) => {
                        if (
                          pg === 1 ||
                          pg === totalMatrixPages ||
                          (pg >= matrixPage - 1 && pg <= matrixPage + 1)
                        ) {
                          return (
                            <button
                              key={pg}
                              type="button"
                              onClick={() => setMatrixPage(pg)}
                              className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-colors ${
                                matrixPage === pg
                                  ? "bg-emerald-700 text-white shadow-2xs"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {pg}
                            </button>
                          );
                        } else if (
                          (pg === 2 && matrixPage > 3) ||
                          (pg === totalMatrixPages - 1 && matrixPage < totalMatrixPages - 2)
                        ) {
                          return <span key={pg} className="px-1 text-slate-400">...</span>;
                        }
                        return null;
                      })}

                      <button
                        type="button"
                        disabled={matrixPage >= totalMatrixPages}
                        onClick={() => setMatrixPage((prev) => Math.min(totalMatrixPages, prev + 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 2: VISUAL FOOD-IMAGE COMPARISON CARDS (SECTION 7)
             ========================================================================= */}
          {activeViewTab === "cards" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-medium">
                Visual dish cards featuring dish thumbnails, preparation totals, guest discards, and cross-category consumption meters.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedCardsMatrix.map((dish) => {
                  const corp = dish.categories["Corporate"];
                  const wed = dish.categories["Wedding"];
                  const soc = dish.categories["Social"];
                  const conf = dish.categories["Conference"];

                  return (
                    <div
                      key={dish.dish_name}
                      className="hotel-card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top Thumbnail & Name */}
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden text-emerald-700 font-bold text-sm">
                            <ChefHat className="w-7 h-7 text-emerald-600/70" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              {dish.category} • {dish.food_type}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm leading-tight mt-0.5">
                              {dish.dish_name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-rose-600">
                                {formatKg(dish.total_waste_kg)} wasted
                              </span>
                              <span className="text-[10px] text-slate-400">
                                of {formatKg(dish.total_prepared_kg)} prep
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Cross-Event Pickup Comparison Meters */}
                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Consumption Pickup By Event Type:
                          </span>

                          {/* Corporate Meter */}
                          <div>
                            <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-0.5">
                              <span>Corporate</span>
                              <span>
                                {corp && corp.records_count > 0
                                  ? `${corp.consumption_rate_pct.toFixed(0)}% eaten (${corp.waste_rate_pct.toFixed(0)}% waste)`
                                  : "No data"}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full transition-all"
                                style={{
                                  width: `${corp && corp.records_count > 0 ? corp.consumption_rate_pct : 0}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Wedding Meter */}
                          <div>
                            <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-0.5">
                              <span>Wedding</span>
                              <span>
                                {wed && wed.records_count > 0
                                  ? `${wed.consumption_rate_pct.toFixed(0)}% eaten (${wed.waste_rate_pct.toFixed(0)}% waste)`
                                  : "No data"}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-rose-600 h-full rounded-full transition-all"
                                style={{
                                  width: `${wed && wed.records_count > 0 ? wed.consumption_rate_pct : 0}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Social Meter */}
                          <div>
                            <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-0.5">
                              <span>Social / Party</span>
                              <span>
                                {soc && soc.records_count > 0
                                  ? `${soc.consumption_rate_pct.toFixed(0)}% eaten (${soc.waste_rate_pct.toFixed(0)}% waste)`
                                  : "No data"}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all"
                                style={{
                                  width: `${soc && soc.records_count > 0 ? soc.consumption_rate_pct : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Operational Takeaway */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 space-y-1">
                          <strong className="text-slate-900 block font-bold text-[11px]">
                            Operational Insight:
                          </strong>
                          <p className="text-[11px] leading-relaxed">{dish.key_takeaway}</p>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-start gap-1.5 text-emerald-900 font-semibold">
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="text-[11px]">
                            <span className="text-emerald-700 font-bold uppercase tracking-wider text-[10px] block">
                              Chef Action
                            </span>
                            {dish.recommendation}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cards Pagination Controls */}
              {filteredDishMatrix.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200/90 bg-white text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span>
                      Showing <strong>{(cardsPage - 1) * cardsPerPage + 1}</strong> to{" "}
                      <strong>{Math.min(cardsPage * cardsPerPage, filteredDishMatrix.length)}</strong> of{" "}
                      <strong>{filteredDishMatrix.length}</strong> dish cards
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={cardsPage <= 1}
                      onClick={() => setCardsPage((prev) => Math.max(1, prev - 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalCardsPages }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setCardsPage(pg)}
                        className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-colors ${
                          cardsPage === pg
                            ? "bg-emerald-700 text-white shadow-2xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {pg}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={cardsPage >= totalCardsPages}
                      onClick={() => setCardsPage((prev) => Math.min(totalCardsPages, prev + 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              VIEW 3: COMPARISON CHARTS & GRAPHS SUITE (SECTION 8)
             ========================================================================= */}
          {activeViewTab === "charts" && (
            <div className="space-y-6">
              {/* Chart 1: Grouped Dish Waste Bar Chart */}
              <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Chart 1: Comparative Dish Breakdown
                    </span>
                    <h4 className="font-serif text-base font-bold text-slate-900">
                      Dish Waste Across Event Types
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Direct head-to-head comparison answering: which event type wastes more of the same dish?
                    </p>
                  </div>

                  {/* Toggle between kg and percentage */}
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setChartUnit("kg")}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        chartUnit === "kg"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Waste in kg
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartUnit("pct")}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        chartUnit === "pct"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Waste Rate (%)
                    </button>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-600" />
                    <span>Corporate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-rose-600" />
                    <span>Wedding</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-amber-500" />
                    <span>Social</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-purple-600" />
                    <span>Conference</span>
                  </div>
                </div>

                {/* Grouped Bar Visualizer */}
                <div className="space-y-4 pt-2">
                  {(data?.grouped_dish_chart_data || []).slice(0, 8).map((item) => {
                    const cCorp = chartUnit === "kg" ? item.corporate_waste_kg : item.corporate_waste_pct;
                    const cWed = chartUnit === "kg" ? item.wedding_waste_kg : item.wedding_waste_pct;
                    const cSoc = chartUnit === "kg" ? item.social_waste_kg : item.social_waste_pct;
                    const cConf = chartUnit === "kg" ? item.conference_waste_kg : item.conference_waste_pct;
                    const maxVal = Math.max(cCorp, cWed, cSoc, cConf, 1);

                    return (
                      <div key={item.dish_name} className="space-y-1.5 border-b border-slate-100 pb-3">
                        <div className="flex justify-between text-xs font-bold text-slate-800">
                          <span>{item.dish_name}</span>
                          <span className="text-[11px] text-slate-400 font-normal">{item.category}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[11px] font-mono">
                          {/* Corp */}
                          <div>
                            <div className="flex justify-between text-slate-500 mb-0.5">
                              <span>Corp</span>
                              <span className="font-bold text-blue-700">
                                {chartUnit === "kg" ? `${cCorp.toFixed(1)}kg` : `${cCorp.toFixed(0)}%`}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full"
                                style={{ width: `${Math.min(100, (cCorp / (chartUnit === "kg" ? 40 : 100)) * 100)}%` }}
                              />
                            </div>
                          </div>
                          {/* Wed */}
                          <div>
                            <div className="flex justify-between text-slate-500 mb-0.5">
                              <span>Wed</span>
                              <span className="font-bold text-rose-700">
                                {chartUnit === "kg" ? `${cWed.toFixed(1)}kg` : `${cWed.toFixed(0)}%`}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-rose-600 h-full rounded-full"
                                style={{ width: `${Math.min(100, (cWed / (chartUnit === "kg" ? 40 : 100)) * 100)}%` }}
                              />
                            </div>
                          </div>
                          {/* Social */}
                          <div>
                            <div className="flex justify-between text-slate-500 mb-0.5">
                              <span>Soc</span>
                              <span className="font-bold text-amber-700">
                                {chartUnit === "kg" ? `${cSoc.toFixed(1)}kg` : `${cSoc.toFixed(0)}%`}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full"
                                style={{ width: `${Math.min(100, (cSoc / (chartUnit === "kg" ? 40 : 100)) * 100)}%` }}
                              />
                            </div>
                          </div>
                          {/* Conf */}
                          <div>
                            <div className="flex justify-between text-slate-500 mb-0.5">
                              <span>Conf</span>
                              <span className="font-bold text-purple-700">
                                {chartUnit === "kg" ? `${cConf.toFixed(1)}kg` : `${cConf.toFixed(0)}%`}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-purple-600 h-full rounded-full"
                                style={{ width: `${Math.min(100, (cConf / (chartUnit === "kg" ? 40 : 100)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 3 & 4 Grid: Waste Per Guest & Financial Impact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chart 3: Waste per Guest */}
                <div className="hotel-card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Chart 3: Normalized Per-Guest Waste
                    </span>
                    <h4 className="font-serif text-base font-bold text-slate-900">
                      Discard Rate per Banquet Guest (g/guest)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Fair comparison eliminating guest count distortion between large weddings and small meetings.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    {(data?.waste_per_guest_chart_data || []).map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{item.category}</span>
                          <span className="font-mono font-bold text-slate-900">
                            {item.waste_per_guest_g.toFixed(0)}g / guest ({item.event_count} events)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, (item.waste_per_guest_g / 150) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart 4: Financial Loss by Dish */}
                <div className="hotel-card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Chart 4: Financial Waste Impact
                    </span>
                    <h4 className="font-serif text-base font-bold text-slate-900">
                      Direct Recipe Procurement Losses (₹)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monetary waste impact calculated from ingredient costs across banquet contracts.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    {(data?.financial_impact_chart_data || []).slice(0, 5).map((item) => (
                      <div key={item.dish_name} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{item.dish_name}</span>
                          <span className="font-mono font-bold text-rose-700">
                            {formatINR(item.total_waste_cost)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-600 h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (item.total_waste_cost /
                                  Math.max(1, data?.financial_impact_chart_data?.[0]?.total_waste_cost || 1)) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart 6: Dish Waste Heatmap */}
              <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Chart 6: Heatmap Matrix
                  </span>
                  <h4 className="font-serif text-base font-bold text-slate-900">
                    Dish-by-Event-Type Waste Percentage Heatmap
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Color intensity represents discard rate. Missing values are explicitly flagged as no data rather than zero waste.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Dish</th>
                        <th className="py-2.5 px-3 text-center">Corporate</th>
                        <th className="py-2.5 px-3 text-center">Wedding</th>
                        <th className="py-2.5 px-3 text-center">Social</th>
                        <th className="py-2.5 px-3 text-center">Conference</th>
                        <th className="py-2.5 px-3 text-center">Custom</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.dish_waste_heatmap || []).slice(0, 10).map((row) => (
                        <tr key={row.dish_name}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{row.dish_name}</td>
                          {canonicalCategories.map((catKey) => {
                            const cell = row.cells[catKey];
                            if (!cell || !cell.has_data) {
                              return (
                                <td key={catKey} className="py-2 px-3 text-center">
                                  <span className="text-slate-300 font-mono text-[11px]">N/A</span>
                                </td>
                              );
                            }
                            const pct = cell.waste_rate_pct;
                            const bgColor =
                              pct >= 50
                                ? "bg-rose-500 text-white font-bold"
                                : pct >= 25
                                ? "bg-amber-400 text-slate-950 font-bold"
                                : pct >= 10
                                ? "bg-emerald-200 text-emerald-950 font-semibold"
                                : "bg-emerald-500 text-white font-bold";

                            return (
                              <td key={catKey} className="py-2 px-3 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-mono ${bgColor}`}>
                                  {pct.toFixed(0)}%
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 4: AUDIENCE BEHAVIORAL PROFILES (SECTION 12)
             ========================================================================= */}
          {activeViewTab === "profiles" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data?.cross_event_comparison?.profiles || []).map((profile) => (
                  <div
                    key={profile.event_type}
                    className="hotel-card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {profile.tagline}
                      </span>
                      <h4 className="font-serif text-base font-bold text-slate-900 mt-0.5">
                        {profile.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 mt-1">
                        <span className="text-emerald-700 font-bold">
                          {profile.consumption_rate_pct.toFixed(1)}% Consumed
                        </span>
                        <span>•</span>
                        <span className="text-rose-700 font-bold">
                          {profile.waste_rate_pct.toFixed(1)}% Waste
                        </span>
                        <span>•</span>
                        <span>{profile.intake_per_guest_g.toFixed(0)}g / Guest</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {profile.behavior_summary}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                      {/* What They Eat More */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                          What They Eat MORE:
                        </span>
                        {profile.eaten_more.map((em) => (
                          <div key={em.dish_name} className="text-[11px] leading-tight">
                            <strong className="text-emerald-950 font-semibold">{em.dish_name}</strong>
                            <span className="text-emerald-700 block text-[10px]">
                              {em.consumption_rate_pct.toFixed(0)}% pickup • {em.reason}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* What They Eat Less */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-rose-50/50 border border-rose-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                          What They Eat LESS:
                        </span>
                        {profile.eaten_less.map((el) => (
                          <div key={el.dish_name} className="text-[11px] leading-tight">
                            <strong className="text-rose-950 font-semibold">{el.dish_name}</strong>
                            <span className="text-rose-700 block text-[10px]">
                              {el.waste_rate_pct?.toFixed(0)}% waste • {el.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs flex items-start gap-1.5">
                      <ChefHat className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 block font-bold text-[10px] uppercase tracking-wider">
                          Kitchen Batch Guidance:
                        </strong>
                        <p className="text-slate-600 text-[11px] mt-0.5">{profile.kitchen_guidance}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 5: DATA INTEGRITY & AUDIT REVIEW (SECTION 14)
             ========================================================================= */}
          {activeViewTab === "integrity" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-white">Data Quality & Anomaly Review Log</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Identifies potential record discrepancies such as physical impossibilities, extreme outliers, or unrecorded headcount.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>
                    Audited:{" "}
                    <strong className="text-white">
                      {data?.data_quality_audit?.total_records_audited || 0}
                    </strong>
                  </span>
                  <span>
                    Clean:{" "}
                    <strong className="text-emerald-400">
                      {data?.data_quality_audit?.clean_records_count || 0}
                    </strong>
                  </span>
                  <span>
                    Flagged:{" "}
                    <strong className="text-amber-400">
                      {data?.data_quality_audit?.flagged_records_count || 0}
                    </strong>
                  </span>
                </div>
              </div>

              {data?.data_quality_audit?.anomalies && data.data_quality_audit.anomalies.length > 0 ? (
                <div className="hotel-card overflow-hidden bg-white border border-slate-200/90 rounded-2xl shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="py-2.5 px-4">Dish & Event</th>
                          <th className="py-2.5 px-4">Hotel</th>
                          <th className="py-2.5 px-4">Identified Reason</th>
                          <th className="py-2.5 px-4 text-center">Severity</th>
                          <th className="py-2.5 px-4 text-center">Audit Status</th>
                          <th className="py-2.5 px-4">Impact on Metrics</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {data.data_quality_audit.anomalies.map((anom, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 block">{anom.dish_name}</span>
                              <span className="text-[10px] text-slate-400">{anom.event_name}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{anom.hotel_name}</td>
                            <td className="py-3 px-4 text-slate-800">{anom.flag_reason}</td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  anom.severity === "Critical"
                                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {anom.severity}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {anom.review_status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-500">{anom.impact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <span className="font-bold text-slate-800 block text-sm">
                    All Recorded Entries Pass Quality Checks
                  </span>
                  No arithmetic discrepancies, negative values, or severe outliers detected in the active scope.
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              SECTION 11: OPERATIONAL INTELLIGENCE & AI ACTION PLAN
             ========================================================================= */}
          <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Operational Intelligence & AI Action Plan
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rules-driven observations, historical baselines, portion metrics, and kitchen actions derived from live data.
                </p>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {(["All", "Critical", "Attention", "Performing Well", "Information"] as PriorityFilter[]).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        priorityFilter === p
                          ? "bg-slate-900 text-white shadow-xs font-bold"
                          : "bg-slate-100 text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Actionable Insight Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInsights.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                  No insights match the active priority filter ({priorityFilter}).
                </div>
              ) : (
                filteredInsights.map((insight) => {
                  const style = getPriorityBadgeStyle(insight.priority);

                  return (
                    <div
                      key={insight.id}
                      className={`p-5 rounded-2xl border ${style.cardBorder} space-y-3 flex flex-col justify-between transition-all hover:shadow-xs`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {style.icon}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              {insight.category}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${style.badge}`}
                          >
                            {insight.priority}
                          </span>
                        </div>

                        <h4 className={`text-sm font-bold mt-2 ${style.titleColor}`}>
                          {insight.title}
                        </h4>

                        <div className="mt-2 text-xs text-slate-700 leading-relaxed font-medium">
                          <strong className="text-slate-900">Observation: </strong>
                          {insight.observation}
                        </div>

                        <div className="mt-1.5 p-2 bg-white/70 rounded-lg border border-slate-200/60 font-mono text-[11px] text-slate-600">
                          <span className="text-slate-400 font-semibold mr-1">Data Metric:</span>
                          {insight.reason_metric}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/60 text-xs">
                        <div className="flex items-start gap-1.5 text-emerald-950 font-semibold">
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-emerald-700 font-bold uppercase tracking-wider text-[10px] block">
                              Recommended Action
                            </span>
                            {insight.recommendation}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
