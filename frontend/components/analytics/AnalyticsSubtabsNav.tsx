"use client";

import React from "react";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Tags,
  UtensilsCrossed,
  Clock,
  TrendingDown,
  Recycle,
  Coins,
  FileSpreadsheet,
  ShieldAlert,
} from "lucide-react";

export type AnalyticsSubtabId =
  | "overview"
  | "hotels"
  | "events"
  | "event_types"
  | "food_dishes"
  | "meals_service"
  | "trends"
  | "waste_reuse"
  | "costs_savings"
  | "reports"
  | "data_quality";

interface SubtabConfig {
  id: AnalyticsSubtabId;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  badge?: string;
  description: string;
}

export const SUBTABS_CONFIG: SubtabConfig[] = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Overview",
    icon: LayoutDashboard,
    description: "Core KPIs, immediate action items & executive summary",
  },
  {
    id: "hotels",
    label: "Hotels",
    shortLabel: "Hotels",
    icon: Building2,
    description: "Property breakdown, hotel drilldown & fair normalized comparisons",
  },
  {
    id: "events",
    label: "Events",
    shortLabel: "Events",
    icon: CalendarDays,
    description: "Banquets, corporate conferences, manual event creation & editing",
  },
  {
    id: "event_types",
    label: "Event Types",
    shortLabel: "Types",
    icon: Tags,
    description: "Corporate, wedding, birthday & empirical benchmark comparisons",
  },
  {
    id: "food_dishes",
    label: "Food & Dishes",
    shortLabel: "Dishes",
    icon: UtensilsCrossed,
    description: "High-waste dishes, consistent performers & Pareto 80/20 analysis",
  },
  {
    id: "meals_service",
    label: "Meals & Service",
    shortLabel: "Service",
    icon: Clock,
    description: "Breakfast, Lunch, Dinner, Buffet vs Set Menu & shift peaks",
  },
  {
    id: "trends",
    label: "Trends & Timeline",
    shortLabel: "Trends",
    icon: TrendingDown,
    description: "Daily timeline, day-of-week patterns & sparse date coverage",
  },
  {
    id: "waste_reuse",
    label: "Waste & Reuse",
    shortLabel: "Waste & Reuse",
    icon: Recycle,
    description: "Kitchen hold, buffet return, safe reuse & mass-balance audit",
  },
  {
    id: "costs_savings",
    label: "Costs & Savings",
    shortLabel: "Costs",
    icon: Coins,
    description: "Direct waste losses, ingredient costs & savings simulator",
  },
  {
    id: "reports",
    label: "Reports",
    shortLabel: "Reports",
    icon: FileSpreadsheet,
    description: "End-of-day hospitality reports, chef sign-off & raw ledger exports",
  },
  {
    id: "data_quality",
    label: "Data Quality",
    shortLabel: "Quality",
    icon: ShieldAlert,
    description: "Completeness scoring, discrepancy alerts & audit resolution",
  },
];

interface AnalyticsSubtabsNavProps {
  activeTab: AnalyticsSubtabId;
  onChangeTab: (tab: AnalyticsSubtabId) => void;
  dataQualityScore?: number;
  unreconciledCount?: number;
}

export const AnalyticsSubtabsNav: React.FC<AnalyticsSubtabsNavProps> = ({
  activeTab,
  onChangeTab,
  dataQualityScore,
  unreconciledCount = 0,
}) => {
  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-2 shadow-xs no-print">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {SUBTABS_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          let badgeContent: React.ReactNode = null;
          if (tab.id === "data_quality" && unreconciledCount > 0) {
            badgeContent = (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                {unreconciledCount}
              </span>
            );
          } else if (tab.id === "data_quality" && dataQualityScore !== undefined) {
            badgeContent = (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                  dataQualityScore >= 90
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {dataQualityScore.toFixed(0)}%
              </span>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              title={tab.description}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  isActive ? "text-emerald-400" : "text-slate-500"
                }`}
              />
              <span>{tab.label}</span>
              {badgeContent}
            </button>
          );
        })}
      </div>
    </div>
  );
};
