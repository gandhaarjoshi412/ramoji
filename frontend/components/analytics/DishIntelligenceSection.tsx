"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface DishIntelligenceSectionProps {
  topWasted: DishIntelligenceRow[];
  consistent: DishIntelligenceRow[];
  overProduction: DishIntelligenceRow[];
  underProduction: DishIntelligenceRow[];
  onSelectDish: (dishName: string) => void;
}

type TabType = "wasted" | "consistent" | "over" | "under";

export const DishIntelligenceSection: React.FC<DishIntelligenceSectionProps> = ({
  topWasted,
  consistent,
  overProduction,
  underProduction,
  onSelectDish,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("wasted");
  const [search, setSearch] = useState("");

  const getCurrentList = () => {
    let list: DishIntelligenceRow[] = [];
    if (activeTab === "wasted") list = topWasted;
    else if (activeTab === "consistent") list = consistent;
    else if (activeTab === "over") list = overProduction;
    else if (activeTab === "under") list = underProduction;

    if (!search.trim()) return list;
    return list.filter(
      (d) =>
        d.dish_name.toLowerCase().includes(search.toLowerCase()) ||
        d.category.toLowerCase().includes(search.toLowerCase())
    );
  };

  const currentList = getCurrentList();

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-5">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Dish Intelligence & Yield Rankings
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any dish to drill down into historical session trends, portion accuracy, and loss causes
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search dishes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setActiveTab("wasted")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "wasted"
              ? "bg-rose-50 text-rose-800 border border-rose-200 shadow-xs"
              : "bg-slate-100/70 text-slate-600 hover:text-slate-900"
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5 text-rose-600" />
          Top Wasted Dishes ({topWasted.length})
        </button>

        <button
          onClick={() => setActiveTab("consistent")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "consistent"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs"
              : "bg-slate-100/70 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Award className="w-3.5 h-3.5 text-emerald-600" />
          Most Consistent Dishes ({consistent.length})
        </button>

        <button
          onClick={() => setActiveTab("over")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "over"
              ? "bg-amber-50 text-amber-800 border border-amber-200 shadow-xs"
              : "bg-slate-100/70 text-slate-600 hover:text-slate-900"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
          Over-Production Alerts ({overProduction.length})
        </button>

        <button
          onClick={() => setActiveTab("under")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "under"
              ? "bg-blue-50 text-blue-800 border border-blue-200 shadow-xs"
              : "bg-slate-100/70 text-slate-600 hover:text-slate-900"
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
          Under-Production Alerts ({underProduction.length})
        </button>
      </div>

      {/* Table */}
      {currentList.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/60">
          <p className="text-xs text-slate-500 font-medium">No dishes found matching this criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Dish Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Prepared</th>
                <th className="py-3 px-3 text-right">Consumed</th>
                <th className="py-3 px-3 text-right">Leftover</th>
                <th className="py-3 px-3 text-right">Waste</th>
                <th className="py-3 px-3 text-right">Waste %</th>
                <th className="py-3 px-3 text-right">Waste/Guest</th>
                <th className="py-3 px-4 text-right">Waste Cost</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {currentList.map((d, idx) => (
                <tr
                  key={d.dish_name}
                  onClick={() => onSelectDish(d.dish_name)}
                  className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 text-center font-bold text-slate-400 group-hover:text-slate-800">
                    #{idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                      {d.dish_name}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Prepared in {d.occurrences} shift{d.occurrences > 1 ? "s" : ""}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 font-semibold">
                      {d.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-800 font-semibold">
                    {formatKg(d.total_prepared_kg)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                    {formatKg(d.total_consumed_kg)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-700">
                    {formatKg(d.total_leftover_kg)}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-700 font-black">
                    {formatKg(d.total_waste_kg)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        d.waste_percentage > 10
                          ? "bg-rose-100 text-rose-800 font-black"
                          : d.waste_percentage > 5
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {d.waste_percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    {d.waste_per_guest_g.toFixed(1)} g
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">
                    {formatINR(d.total_waste_cost)}
                  </td>
                  <td className="py-3 px-4 text-center">
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
