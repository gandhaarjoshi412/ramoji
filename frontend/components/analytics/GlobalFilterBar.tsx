"use client";

import React from "react";
import {
  Calendar,
  Building2,
  Utensils,
  Clock,
  Sparkles,
  Upload,
  Download,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  Tag,
} from "lucide-react";
import { AnalyticsFilterParams, ServiceType, SessionType } from "@/types/analytics";

interface GlobalFilterBarProps {
  filters: AnalyticsFilterParams;
  onChange: (updated: Partial<AnalyticsFilterParams>) => void;
  onReset: () => void;
  onOpenUpload: () => void;
  onExport: () => void;
  activeContextText: string;
  hotelOptions: string[];
  sessionOptions: string[];
  serviceTypeOptions: string[];
  categoryOptions: string[];
  eventOptions: { id: string | number; name: string }[];
  isLoading?: boolean;
}

const DATE_PRESETS = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last_7", label: "Last 7 Days" },
  { id: "last_30", label: "Last 30 Days" },
  { id: "this_month", label: "This Month" },
  { id: "previous_month", label: "Previous Month" },
  { id: "custom", label: "Custom Range" },
];

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  onOpenUpload,
  onExport,
  activeContextText,
  hotelOptions,
  sessionOptions,
  serviceTypeOptions,
  categoryOptions,
  eventOptions,
  isLoading,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 no-print">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Analytics Context
            </h2>
          </div>
          <div className="text-sm font-semibold text-slate-900 mt-0.5">
            {activeContextText}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onReset}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Reset all filters to default"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Reset Filters
          </button>

          <button
            onClick={onExport}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
            title="Export Dashboard Analytics as CSV or Print PDF"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Data
          </button>

          <button
            onClick={onOpenUpload}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-900 shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 hover:shadow-md"
            title="Upload food production & waste Excel reports"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            Upload Report (.xlsx)
          </button>
        </div>
      </div>

      {/* Primary Date Presets Pill Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          Period:
        </span>
        {DATE_PRESETS.map((preset) => {
          const isSelected = filters.date_preset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onChange({ date_preset: preset.id })}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Picker when "custom" is selected */}
      {filters.date_preset === "custom" && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={filters.start_date || ""}
              onChange={(e) => onChange({ start_date: e.target.value })}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={filters.end_date || ""}
              onChange={(e) => onChange({ end_date: e.target.value })}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Multi-Dimensional Filter Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Hotel / Property */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Hotel / Property
          </label>
          <div className="relative">
            <select
              value={filters.hotel}
              onChange={(e) => onChange({ hotel: e.target.value })}
              className="w-full appearance-none px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-slate-800 font-semibold pr-8 focus:outline-emerald-500 cursor-pointer"
            >
              <option value="all">All Hotels & Properties</option>
              {hotelOptions.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Service Type */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Service Type
          </label>
          <div className="relative">
            <select
              value={filters.service_type || "all"}
              onChange={(e) => onChange({ service_type: e.target.value })}
              className="w-full appearance-none px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-slate-800 font-semibold pr-8 focus:outline-emerald-500 cursor-pointer"
            >
              <option value="all">All Service Types</option>
              {serviceTypeOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Session / Meal */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Session / Meal
          </label>
          <div className="relative">
            <select
              value={filters.session || "all"}
              onChange={(e) => onChange({ session: e.target.value })}
              className="w-full appearance-none px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-slate-800 font-semibold pr-8 focus:outline-emerald-500 cursor-pointer"
            >
              <option value="all">All Sessions</option>
              {sessionOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Event */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Event / Banquet
          </label>
          <div className="relative">
            <select
              value={filters.event_id || "all"}
              onChange={(e) => onChange({ event_id: e.target.value })}
              className="w-full appearance-none px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-slate-800 font-semibold pr-8 focus:outline-emerald-500 cursor-pointer"
            >
              <option value="all">All Events & Daily</option>
              {eventOptions.map((ev) => (
                <option key={ev.id} value={String(ev.id)}>
                  {ev.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Dish Category */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Food Category
          </label>
          <div className="relative">
            <select
              value={filters.dish_category || "all"}
              onChange={(e) => onChange({ dish_category: e.target.value })}
              className="w-full appearance-none px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-slate-800 font-semibold pr-8 focus:outline-emerald-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Data Source */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Data Source
          </label>
          <div className="relative">
            <select
              value={filters.data_source || "all"}
              onChange={(e) => onChange({ data_source: e.target.value })}
              className="w-full appearance-none px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-slate-800 font-semibold pr-8 focus:outline-emerald-500 cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="Excel Import">Excel Import</option>
              <option value="AI Detection">AI Camera Device</option>
              <option value="Manual Entry">Manual Kitchen Entry</option>
              <option value="API">POS / API Ingestion</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
