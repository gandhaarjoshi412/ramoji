"use client";

import React, { useState } from "react";
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
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { AnalyticsFilterParams, ServiceType, SessionType } from "@/types/analytics";
import { apiRequest } from "@/lib/api";

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
  eventCategoryOptions?: string[];
  onCategoryCreated?: (catName: string) => void;
  isLoading?: boolean;
}

const DATE_PRESETS = [
  { id: "all", label: "All Dates (Consolidated)" },
  { id: "today", label: "Daily (Today)" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last_7", label: "Weekly (Last 7 Days)" },
  { id: "this_week", label: "This Week" },
  { id: "last_30", label: "Monthly (Last 30 Days)" },
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
  eventCategoryOptions = [],
  onCategoryCreated,
  isLoading,
}) => {
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setCatError("Please enter a category name.");
      return;
    }
    setCatLoading(true);
    setCatError(null);
    try {
      await apiRequest("/api/events/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: newCatDesc.trim() || undefined,
        }),
      });
      setNewCatName("");
      setNewCatDesc("");
      setNewCategoryModalOpen(false);
      onChange({ event_type: trimmed });
      onCategoryCreated?.(trimmed);
    } catch (err: any) {
      setCatError(err.message || "Failed to create category");
    } finally {
      setCatLoading(false);
    }
  };

  const handleHotelChange = (newHotel: string) => {
    // If the hotel changed, clear event selection to avoid cross-hotel mismatch
    onChange({
      hotel: newHotel,
      event_id: "all",
    });
  };
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-xs">
        {/* Hotel / Property */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Hotel / Property
          </label>
          <div className="relative">
            <select
              value={filters.hotel}
              onChange={(e) => handleHotelChange(e.target.value)}
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

        {/* Event Category */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Event Category
            </label>
            <button
              type="button"
              onClick={() => setNewCategoryModalOpen(true)}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer flex items-center gap-0.5"
              title="Create a new custom event category in database"
            >
              <Plus className="w-2.5 h-2.5" /> New
            </button>
          </div>
          <div className="relative">
            <select
              value={filters.event_type || "all"}
              onChange={(e) => onChange({ event_type: e.target.value })}
              className="w-full appearance-none px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-slate-800 font-semibold pr-8 focus:outline-emerald-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {eventCategoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
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

      {/* Modal for Creating Custom Event Category */}
      {newCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Create Event Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP Gala Dinner, Alumni Reunion"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-500 font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief operational context for this event type"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-500 font-medium"
                />
              </div>

              {catError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg font-medium">
                  {catError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewCategoryModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  disabled={catLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catLoading || !newCatName.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {catLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
