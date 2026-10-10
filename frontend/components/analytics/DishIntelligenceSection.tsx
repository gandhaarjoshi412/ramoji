"use client";

import React, { useState, useMemo } from "react";
import { DishIntelligenceRow } from "@/types/analytics";
import { formatINR, formatKg } from "@/lib/api";
import {
  UtensilsCrossed,
  Award,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Search,
  CheckCircle,
  HelpCircle,
  Scale,
  SlidersHorizontal,
  Layers,
  ChefHat,
  ArrowUpDown,
  Sparkles,
  CheckSquare,
  Square,
  X,
  Flame,
} from "lucide-react";

interface DishIntelligenceSectionProps {
  topWasted: DishIntelligenceRow[];
  consistent: DishIntelligenceRow[];
  overProduction: DishIntelligenceRow[];
  underProduction: DishIntelligenceRow[];
  dishLeaderboard?: DishIntelligenceRow[];
  consumptionVsWaste?: DishIntelligenceRow[];
  onSelectDish: (dishName: string) => void;
}

type MainViewTab = "leaderboard" | "wasted" | "comparison" | "batching";
type BatchingSubTab = "over" | "under" | "consistent";
type SortOption =
  | "consumed_kg"
  | "consumed_per_guest"
  | "waste_kg"
  | "waste_pct"
  | "waste_cost"
  | "consumption_rate"
  | "prep_kg";

export const DishIntelligenceSection: React.FC<DishIntelligenceSectionProps> = ({
  topWasted = [],
  consistent = [],
  overProduction = [],
  underProduction = [],
  dishLeaderboard = [],
  consumptionVsWaste = [],
  onSelectDish,
}) => {
  const [activeTab, setActiveTab] = useState<MainViewTab>("leaderboard");
  const [batchingTab, setBatchingTab] = useState<BatchingSubTab>("over");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("consumed_kg");
  const [sortAsc, setSortAsc] = useState(false);

  // Side-by-side dish selection (up to 4 dishes)
  const [selectedDishesForComparison, setSelectedDishesForComparison] = useState<string[]>([]);

  // Base list of all unique dishes from available sources
  const allDishes = useMemo<DishIntelligenceRow[]>(() => {
    const map = new Map<string, DishIntelligenceRow>();
    const combine = [
      ...dishLeaderboard,
      ...consumptionVsWaste,
      ...topWasted,
      ...consistent,
      ...overProduction,
      ...underProduction,
    ];
    combine.forEach((d) => {
      if (d && d.dish_name && !map.has(d.dish_name)) {
        map.set(d.dish_name, d);
      }
    });
    return Array.from(map.values());
  }, [dishLeaderboard, consumptionVsWaste, topWasted, consistent, overProduction, underProduction]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    allDishes.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set).sort();
  }, [allDishes]);

  // Handle Sort Change
  const handleSort = (field: SortOption) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  // Toggle dish selection for side-by-side comparison
  const toggleDishCompare = (dishName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDishesForComparison((prev) => {
      if (prev.includes(dishName)) {
        return prev.filter((d) => d !== dishName);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), dishName];
      }
      return [...prev, dishName];
    });
  };

  // Get active source list based on tab
  const getActiveSourceList = (): DishIntelligenceRow[] => {
    switch (activeTab) {
      case "leaderboard":
        return dishLeaderboard.length > 0 ? dishLeaderboard : allDishes;
      case "wasted":
        return topWasted.length > 0 ? topWasted : allDishes;
      case "comparison":
        return consumptionVsWaste.length > 0 ? consumptionVsWaste : allDishes;
      case "batching":
        if (batchingTab === "over") return overProduction;
        if (batchingTab === "under") return underProduction;
        return consistent;
      default:
        return allDishes;
    }
  };

  // Filtered & Sorted list
  const processedList = useMemo(() => {
    let list = [...getActiveSourceList()];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.dish_name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (d.operational_action && d.operational_action.toLowerCase().includes(q)) ||
          (d.most_affected_event_type && d.most_affected_event_type.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      list = list.filter((d) => d.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Sort
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      switch (sortBy) {
        case "consumed_kg":
          valA = a.total_consumed_kg || 0;
          valB = b.total_consumed_kg || 0;
          break;
        case "consumed_per_guest":
          valA = a.consumed_per_guest_g || 0;
          valB = b.consumed_per_guest_g || 0;
          break;
        case "waste_kg":
          valA = a.total_waste_kg || 0;
          valB = b.total_waste_kg || 0;
          break;
        case "waste_pct":
          valA = a.waste_percentage || 0;
          valB = b.waste_percentage || 0;
          break;
        case "waste_cost":
          valA = a.total_waste_cost || a.waste_cost || 0;
          valB = b.total_waste_cost || b.waste_cost || 0;
          break;
        case "consumption_rate":
          valA = a.consumption_rate_pct || 0;
          valB = b.consumption_rate_pct || 0;
          break;
        case "prep_kg":
          valA = a.total_prepared_kg || 0;
          valB = b.total_prepared_kg || 0;
          break;
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [activeTab, batchingTab, search, categoryFilter, sortBy, sortAsc, allDishes]);

  // Selected dishes details for side-by-side comparison modal/section
  const comparedDishesData = useMemo(() => {
    return selectedDishesForComparison
      .map((name) => allDishes.find((d) => d.dish_name === name))
      .filter((d): d is DishIntelligenceRow => d !== undefined);
  }, [selectedDishesForComparison, allDishes]);

  // Operational Action Tag Styler
  const getActionBadge = (action?: string) => {
    if (!action) return null;
    const lower = action.toLowerCase();
    if (lower.includes("batch")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Prepare in Batches
        </span>
      );
    }
    if (lower.includes("reduce") || lower.includes("trim")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          Trim Preparation
        </span>
      );
    }
    if (lower.includes("maintain") || lower.includes("popular")) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Optimal Par
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        {action}
      </span>
    );
  };

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Dish-Wise Intelligence & Decision Support
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Data-backed dish analytics comparing consumption volume, discard rates, guest intake, and kitchen batching. Drill down to inspect session portioning and root causes of waste.
          </p>
        </div>

        {/* Global Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search dish, category, action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Views Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs">
          <button
            onClick={() => {
              setActiveTab("leaderboard");
              setSortBy("consumed_kg");
              setSortAsc(false);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "leaderboard"
                ? "bg-white text-emerald-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />
            Consumption Leaderboard ({dishLeaderboard.length || allDishes.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("wasted");
              setSortBy("waste_kg");
              setSortAsc(false);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "wasted"
                ? "bg-white text-rose-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Most-Wasted Dishes ({topWasted.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("comparison");
              setSortBy("consumed_kg");
              setSortAsc(false);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "comparison"
                ? "bg-white text-indigo-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
            Consumed vs. Wasted
          </button>

          <button
            onClick={() => {
              setActiveTab("batching");
              setSortBy("waste_pct");
              setSortAsc(false);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "batching"
                ? "bg-white text-amber-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ChefHat className="w-3.5 h-3.5 text-amber-600" />
            Kitchen Batching Alerts ({overProduction.length + underProduction.length})
          </button>
        </div>

        {/* Filter Controls: Category & Sort */}
        <div className="flex items-center gap-2 text-xs">
          {/* Category Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs cursor-pointer"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                setSortAsc(false);
              }}
              className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs cursor-pointer"
            >
              <option value="consumed_kg">Sort: Total Consumption (kg)</option>
              <option value="consumed_per_guest">Sort: Consumed / Guest (g)</option>
              <option value="waste_kg">Sort: Waste Quantity (kg)</option>
              <option value="waste_pct">Sort: Waste Rate (%)</option>
              <option value="waste_cost">Sort: Estimated Waste Loss (₹)</option>
              <option value="consumption_rate">Sort: Consumption Rate (%)</option>
              <option value="prep_kg">Sort: Prepared Quantity (kg)</option>
            </select>
          </div>

          {/* Asc/Desc Toggle Button */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            title={sortAsc ? "Sort Descending" : "Sort Ascending"}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Batching Subtabs (Visible when activeTab === "batching") */}
      {activeTab === "batching" && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => setBatchingTab("over")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              batchingTab === "over"
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-3 h-3 text-amber-600" />
            Over-Production Risks ({overProduction.length})
          </button>
          <button
            onClick={() => setBatchingTab("under")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              batchingTab === "under"
                ? "bg-blue-100 text-blue-900 border border-blue-300"
                : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingDown className="w-3 h-3 text-blue-600" />
            Under-Production / Stockout Risk ({underProduction.length})
          </button>
          <button
            onClick={() => setBatchingTab("consistent")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              batchingTab === "consistent"
                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Award className="w-3 h-3 text-emerald-600" />
            Consistent Par Items ({consistent.length})
          </button>
        </div>
      )}

      {/* Side-by-Side Comparison Drawer (When 2+ dishes are selected) */}
      {comparedDishesData.length >= 2 && (
        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h4 className="font-serif text-sm font-bold text-indigo-950">
                Side-by-Side Dish Comparison ({comparedDishesData.length} Selected)
              </h4>
            </div>
            <button
              onClick={() => setSelectedDishesForComparison([])}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
            >
              Clear Comparison
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {comparedDishesData.map((dish) => (
              <div
                key={dish.dish_name}
                className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-2 relative"
              >
                <button
                  onClick={(e) => toggleDishCompare(dish.dish_name, e)}
                  className="absolute top-2 right-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div>
                  <div className="font-bold text-xs text-slate-900 truncate pr-4">
                    {dish.dish_name}
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">{dish.category}</span>
                </div>

                <div className="space-y-1 text-xs border-t border-slate-100 pt-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Prepared:</span>
                    <strong className="text-slate-900">{formatKg(dish.total_prepared_kg)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Consumed:</span>
                    <strong>{formatKg(dish.total_consumed_kg)} ({dish.consumption_rate_pct.toFixed(0)}%)</strong>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>Waste:</span>
                    <strong>{formatKg(dish.total_waste_kg)} ({dish.waste_percentage.toFixed(0)}%)</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Intake / Guest:</span>
                    <strong className="font-mono">{(dish.consumed_per_guest_g || 0).toFixed(0)} g</strong>
                  </div>
                  <div className="flex justify-between text-slate-900 font-semibold">
                    <span>Loss:</span>
                    <strong>{formatINR(dish.total_waste_cost || dish.waste_cost || 0)}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  {getActionBadge(dish.operational_action)}
                  <button
                    onClick={() => onSelectDish(dish.dish_name)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    View Drill Down
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Presentation */}
      {processedList.length === 0 ? (
        <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
          <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="font-serif text-sm font-bold text-slate-700">No dishes match criteria</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search terms, changing the category filter, or selecting a broader date range.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <span title="Select to compare side-by-side">Comp</span>
                </th>
                <th className="py-3 px-2 w-10 text-center">#</th>
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort("prep_kg")}
                >
                  Dish Name & Shifts
                </th>
                <th className="py-3 px-3">Category</th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort("prep_kg")}
                >
                  Prepared {sortBy === "prep_kg" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort("consumed_kg")}
                >
                  Consumed {sortBy === "consumed_kg" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort("waste_kg")}
                >
                  Waste {sortBy === "waste_kg" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort("waste_pct")}
                >
                  Waste % {sortBy === "waste_pct" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort("consumed_per_guest")}
                >
                  Intake / Guest {sortBy === "consumed_per_guest" && (sortAsc ? "↑" : "↓")}
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort("waste_cost")}
                >
                  Waste Loss {sortBy === "waste_cost" && (sortAsc ? "↑" : "↓")}
                </th>
                <th className="py-3 px-4 text-center">Operational Action</th>
                <th className="py-3 px-3 text-center">Drill Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {processedList.map((d, idx) => {
                const isCompared = selectedDishesForComparison.includes(d.dish_name);
                const prep = d.total_prepared_kg || 0;
                const consumed = d.total_consumed_kg || 0;
                const waste = d.total_waste_kg || 0;
                const consumedPct = prep > 0 ? (consumed / prep) * 100 : 0;
                const wastePct = d.waste_percentage || 0;
                const cost = d.total_waste_cost || d.waste_cost || 0;
                const intakeG = d.consumed_per_guest_g || 0;

                return (
                  <tr
                    key={d.dish_name}
                    onClick={() => onSelectDish(d.dish_name)}
                    className={`hover:bg-slate-50/90 transition-colors cursor-pointer group ${
                      isCompared ? "bg-indigo-50/40" : ""
                    }`}
                  >
                    {/* Checkbox for side-by-side comparison */}
                    <td
                      className="py-3 px-3 text-center"
                      onClick={(e) => toggleDishCompare(d.dish_name, e)}
                    >
                      <button
                        type="button"
                        title={isCompared ? "Remove from comparison" : "Add to side-by-side comparison"}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {isCompared ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-2 text-center font-bold text-slate-400 group-hover:text-slate-800">
                      #{idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                        {d.dish_name}
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>
                          {d.events_count ?? d.occurrences ?? 1} shift{(d.events_count ?? d.occurrences ?? 1) > 1 ? "s" : ""}
                        </span>
                        {d.dish_pax ? (
                          <span>• {d.dish_pax} logged guests</span>
                        ) : null}
                        {d.most_affected_event_type ? (
                          <span>• Highest at {d.most_affected_event_type}</span>
                        ) : null}
                      </div>

                      {/* Visual Bar Ratio: Consumed (Green) vs Waste (Red) */}
                      {prep > 0 && (
                        <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5 flex">
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${Math.min(100, consumedPct)}%` }}
                            title={`Consumed: ${consumedPct.toFixed(0)}%`}
                          />
                          <div
                            className="bg-rose-500 h-full"
                            style={{ width: `${Math.min(100, wastePct)}%` }}
                            title={`Waste: ${wastePct.toFixed(0)}%`}
                          />
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 font-semibold">
                        {d.category || "Uncategorized"}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right text-slate-800 font-semibold">
                      {formatKg(prep)}
                      {d.avg_prepared_per_event ? (
                        <div className="text-[9px] text-slate-400 font-normal">
                          ~{formatKg(d.avg_prepared_per_event)} / shift
                        </div>
                      ) : null}
                    </td>

                    <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                      {formatKg(consumed)}
                      <div className="text-[9px] text-emerald-600 font-normal">
                        {consumedPct.toFixed(0)}% eaten
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right text-rose-700 font-black">
                      {formatKg(waste)}
                      {d.avg_waste_per_event ? (
                        <div className="text-[9px] text-rose-500 font-normal">
                          ~{formatKg(d.avg_waste_per_event)} / shift
                        </div>
                      ) : null}
                    </td>

                    <td className="py-3 px-3 text-right font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          wastePct > 15
                            ? "bg-rose-100 text-rose-800 font-black"
                            : wastePct > 7
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {wastePct.toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {intakeG > 0 ? `${intakeG.toFixed(0)} g` : "—"}
                    </td>

                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {cost > 0 ? formatINR(cost) : "—"}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {getActionBadge(d.operational_action || (d.is_over_produced ? "Batch Prep" : undefined))}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDish(d.dish_name);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                      >
                        Drill Down
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
