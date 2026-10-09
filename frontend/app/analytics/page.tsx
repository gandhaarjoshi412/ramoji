"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import {
  AnalyticsFilterParams,
  AnalyticsOverviewResponse,
  DishDrillDownDetail,
  UploadConfirmResponse,
} from "@/types/analytics";

import { GlobalFilterBar } from "@/components/analytics/GlobalFilterBar";
import { AnalyticsSubtabsNav, AnalyticsSubtabId } from "@/components/analytics/AnalyticsSubtabsNav";

// Existing modular analytics sections
import { ExecutiveKpiGrid } from "@/components/analytics/ExecutiveKpiGrid";
import { ExecutiveOverviewSection } from "@/components/analytics/ExecutiveOverviewSection";
import { DailyTrendsSection } from "@/components/analytics/DailyTrendsSection";
import { SessionAnalyticsSection } from "@/components/analytics/SessionAnalyticsSection";
import { ServiceTypeAnalyticsSection } from "@/components/analytics/ServiceTypeAnalyticsSection";
import { EventPerformanceSection } from "@/components/analytics/EventPerformanceSection";
import { DishIntelligenceSection } from "@/components/analytics/DishIntelligenceSection";
import { DishDetailModal } from "@/components/analytics/DishDetailModal";
import { ParetoSection } from "@/components/analytics/ParetoSection";
import { WasteHeatmapSection } from "@/components/analytics/WasteHeatmapSection";
import { LeftoverReuseSection } from "@/components/analytics/LeftoverReuseSection";
import { FinancialImpactSection } from "@/components/analytics/FinancialImpactSection";
import { ManagementInsightsSection } from "@/components/analytics/ManagementInsightsSection";
import { AuditAndDataQualitySection } from "@/components/analytics/AuditAndDataQualitySection";
import { DetailedDataTable } from "@/components/analytics/DetailedDataTable";
import { ExcelUploadModal } from "@/components/analytics/ExcelUploadModal";

// Dedicated subtab views
import { HotelsSubtab } from "@/components/analytics/subtabs/HotelsSubtab";
import { EventsSubtab } from "@/components/analytics/subtabs/EventsSubtab";
import { EventTypesSubtab } from "@/components/analytics/subtabs/EventTypesSubtab";
import { ReportsSubtab } from "@/components/analytics/subtabs/ReportsSubtab";
import { DataQualitySubtab } from "@/components/analytics/subtabs/DataQualitySubtab";

import {
  Sparkles,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Upload,
  Download,
  Layers,
  ChefHat,
  ArrowRight,
  CheckCircle2,
  X,
  Building2,
  CalendarDays,
  UtensilsCrossed,
  Tags,
  Clock,
  TrendingDown,
  Recycle,
  Coins,
  FileSpreadsheet,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

const DEFAULT_FILTERS: AnalyticsFilterParams = {
  date_preset: "all",
  hotel: "all",
  service_type: "all",
  session: "all",
  event_id: "all",
  event_type: "all",
  dish_category: "all",
  data_source: "all",
};

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AnalyticsSubtabId>("overview");
  const [filters, setFilters] = useState<AnalyticsFilterParams>(DEFAULT_FILTERS);
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = React.useRef(0);

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadConfirmation, setUploadConfirmation] = useState<UploadConfirmResponse | null>(null);
  const [selectedDishDetail, setSelectedDishDetail] = useState<DishDrillDownDetail | null>(null);
  const [loadingDishDrilldown, setLoadingDishDrilldown] = useState(false);

  const handleUploadSuccess = (confirmedData?: UploadConfirmResponse) => {
    if (confirmedData && confirmedData.status === "success") {
      setUploadConfirmation(confirmedData);
    }
    fetchAnalytics();
  };

  // Fetch overview data with race condition protection
  const fetchAnalytics = useCallback(async () => {
    const currentReqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (filters.date_preset) query.set("date_preset", filters.date_preset);
      if (filters.start_date) query.set("start_date", filters.start_date);
      if (filters.end_date) query.set("end_date", filters.end_date);
      if (filters.hotel && filters.hotel !== "all") query.set("hotel", filters.hotel);
      if (filters.service_type && filters.service_type !== "all") query.set("service_type", filters.service_type);
      if (filters.session && filters.session !== "all") query.set("session", filters.session);
      if (filters.event_id && filters.event_id !== "all") query.set("event_id", filters.event_id);
      if (filters.event_type && filters.event_type !== "all") query.set("event_type", filters.event_type);
      if (filters.dish_category && filters.dish_category !== "all") query.set("dish_category", filters.dish_category);
      if (filters.data_source && filters.data_source !== "all") query.set("data_source", filters.data_source);

      const res = await apiRequest<AnalyticsOverviewResponse>(
        `/api/analytics/overview?${query.toString()}`
      );
      if (reqIdRef.current === currentReqId) {
        setData(res);
      }
    } catch (err: any) {
      if (reqIdRef.current === currentReqId) {
        setError(err.message || "Failed to load hospitality analytics");
      }
    } finally {
      if (reqIdRef.current === currentReqId) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        fetchAnalytics();
      }
    }
  }, [user, authLoading, router, fetchAnalytics]);

  const handleFilterChange = (updated: Partial<AnalyticsFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Dish drilldown click
  const handleSelectDish = async (dishName: string) => {
    setLoadingDishDrilldown(true);
    try {
      const res = await apiRequest<DishDrillDownDetail>(
        `/api/analytics/dish-drilldown?dish_name=${encodeURIComponent(dishName)}`
      );
      setSelectedDishDetail(res);
    } catch (err) {
      console.error("Failed to fetch dish details", err);
    } finally {
      setLoadingDishDrilldown(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!data?.raw_records?.length) return;
    const headers = [
      "Record ID",
      "Date",
      "Hotel",
      "Event Name",
      "Session",
      "Service Format",
      "Pax",
      "Dish Name",
      "Category",
      "Cooked (kg)",
      "Consumed (kg)",
      "Leftover (kg)",
      "Reused (kg)",
      "Discarded Waste (kg)",
      "Waste Cost (INR)",
      "Waste %",
    ];

    const rows = data.raw_records.map((r) => [
      r.id,
      r.date,
      `"${r.hotel}"`,
      `"${r.event_name || ""}"`,
      `"${r.session}"`,
      `"${r.service_type}"`,
      r.pax,
      `"${r.dish_name}"`,
      `"${r.dish_category}"`,
      r.actual_production_kg,
      r.actual_consumption_kg,
      r.total_leftover_kg,
      r.reuse_quantity_kg,
      r.total_waste_kg,
      r.waste_cost,
      r.waste_percentage,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Platesight_Culinary_Audit_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    handleExportCsv();
  };

  const contextDisplay = data?.filter_context
    ? `Scope: ${data.filter_context.hotel_name} • ${data.filter_context.date_display} • ${data.filter_context.active_sessions}`
    : "Consolidated Operations Intelligence";

  return (
    <div className="space-y-6 pb-20">
      {/* Executive Header Banner */}
      <div className="rounded-2xl p-7 sm:p-9 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white border border-slate-800/80 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Executive Food Intelligence & Yield Optimization
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Culinary Analytics & Operations Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
              Transforming raw kitchen production, banquet buffet returns, and unconsumed food records into actionable operational decisions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={fetchAnalytics}
              title="Refresh Analytics"
              className="p-2.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Upload className="w-4 h-4" />
              Upload Report (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Persistent Global Filter Bar */}
      <GlobalFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        onOpenUpload={() => setUploadModalOpen(true)}
        onExport={handleExportCsv}
        activeContextText={contextDisplay}
        hotelOptions={data?.filter_options?.hotels || []}
        sessionOptions={data?.filter_options?.sessions || []}
        serviceTypeOptions={data?.filter_options?.service_types || []}
        categoryOptions={data?.filter_options?.categories || []}
        eventOptions={data?.filter_options?.events || []}
        eventCategoryOptions={data?.filter_options?.event_types || []}
        onCategoryCreated={() => fetchAnalytics()}
        isLoading={loading}
      />

      {/* 11 Intuitive Responsive Horizontal Subtabs Navigation (Part E) */}
      <AnalyticsSubtabsNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        dataQualityScore={data?.data_quality?.overall_score_pct}
        unreconciledCount={data?.data_quality?.unreconciled_count}
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchAnalytics}
            className="underline uppercase tracking-wider font-bold text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Skeleton Loading State (Part K: No layout shift, no fake zeros) */}
      {authLoading || (loading && !data) ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl border border-slate-200/80" />
            ))}
          </div>
          <div className="h-64 bg-slate-100 rounded-2xl border border-slate-200/80" />
          <div className="h-48 bg-slate-100 rounded-2xl border border-slate-200/80" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Sensible Empty State when active date filter has no recorded activity (Part 1 Problem B) */}
              {data.raw_records.length === 0 && (
                <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-amber-950">
                        No Operational Records for {data.filter_context?.date_display || "Selected Period"}
                      </h4>
                      <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                        No banquet services, buffet returns, or waste scans were recorded under this date filter. Headline cards below display 0 kg because no records exist for this period.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFilterChange({ date_preset: "all", start_date: undefined, end_date: undefined })}
                    className="px-4 py-2 bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                  >
                    Switch to All Dates
                  </button>
                </div>
              )}

              {/* Core Headline KPI Cards */}
              <ExecutiveKpiGrid kpis={data.kpis} />

              {/* Actionable Recommendations & Root-Cause Observations */}
              <ManagementInsightsSection
                executiveSummary={data.executive_summary}
                insights={data.insights}
              />

              {/* Horizontal Food Mass Flow (Cooked -> Eaten -> Leftover -> Reused -> Discarded) */}
              <ExecutiveOverviewSection
                foodFlow={data.food_flow}
                wasteCostInr={data.financial_impact.total_waste_cost}
              />

              {/* Quick links to deeper subtabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <button
                  onClick={() => setActiveTab("hotels")}
                  className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-center justify-between text-slate-800 font-bold text-xs">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      Property Deep Dive
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Compare Hotel Sahara, Hotel Sitara & Dolphin Hotels normalized metrics.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab("events")}
                  className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-center justify-between text-slate-800 font-bold text-xs">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-emerald-600" />
                      Banquet Ledger & CRUD
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Create new events, enter dish quantities & inspect safe deletion impacts.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab("data_quality")}
                  className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-center justify-between text-slate-800 font-bold text-xs">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Audit & Data Quality Center
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Review formulaic health scores ({data.data_quality.overall_score_pct}%) & resolve discrepancies.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: HOTELS */}
          {activeTab === "hotels" && (
            <HotelsSubtab
              selectedHotel={filters.hotel || "all"}
              onSelectHotel={(hotelName) => handleFilterChange({ hotel: hotelName })}
              datePreset={filters.date_preset}
              startDate={filters.start_date}
              endDate={filters.end_date}
            />
          )}

          {/* TAB 3: EVENTS (Part 1 Problem A: Synchronized with active date and event type filters) */}
          {activeTab === "events" && (
            <EventsSubtab
              selectedHotel={filters.hotel || "all"}
              datePreset={filters.date_preset}
              startDate={filters.start_date}
              endDate={filters.end_date}
              selectedEventType={filters.event_type}
              onSelectEvent={(evId) => handleFilterChange({ event_id: evId })}
            />
          )}

          {/* TAB 4: EVENT TYPES */}
          {activeTab === "event_types" && (
            <EventTypesSubtab
              selectedHotel={filters.hotel || "all"}
              datePreset={filters.date_preset}
              startDate={filters.start_date}
              endDate={filters.end_date}
            />
          )}

          {/* TAB 5: FOOD & DISHES */}
          {activeTab === "food_dishes" && (
            <div className="space-y-6">
              <DishIntelligenceSection
                topWasted={data.top_wasted_dishes}
                consistent={data.consistent_dishes}
                overProduction={data.over_production_alerts}
                underProduction={data.under_production_alerts}
                onSelectDish={handleSelectDish}
              />

              <ParetoSection
                paretoItems={data.pareto_analysis}
                totalWasteKg={data.kpis.total_food_waste_kg.current}
              />
            </div>
          )}

          {/* TAB 6: MEALS & SERVICE */}
          {activeTab === "meals_service" && (
            <div className="space-y-6">
              <SessionAnalyticsSection sessions={data.session_comparison} />
              <ServiceTypeAnalyticsSection serviceTypes={data.service_type_comparison} />
            </div>
          )}

          {/* TAB 7: TRENDS & IMPROVEMENT */}
          {activeTab === "trends" && (
            <div className="space-y-6">
              <DailyTrendsSection
                trends={data.daily_trends}
                dateCoverage={data.date_coverage}
              />
              <WasteHeatmapSection
                heatmapData={data.heatmap}
                dayOfWeekData={data.day_of_week_analysis}
              />
            </div>
          )}

          {/* TAB 8: WASTE & REUSE */}
          {activeTab === "waste_reuse" && (
            <div className="space-y-6">
              <LeftoverReuseSection
                totalProductionKg={data.kpis.total_food_prepared_kg.current}
                buffetLeftoverKg={data.food_flow.buffet_leftover_kg}
                kitchenLeftoverKg={data.food_flow.kitchen_leftover_kg}
                totalLeftoverKg={data.food_flow.total_leftover_kg}
                reuseKg={data.food_flow.reuse_kg}
                finalWasteKg={data.food_flow.final_waste_kg}
                massBalanceAudit={data.mass_balance_audit}
              />
            </div>
          )}

          {/* TAB 9: COSTS & SAVINGS */}
          {activeTab === "costs_savings" && (
            <div className="space-y-6">
              <FinancialImpactSection financials={data.financial_impact} />
            </div>
          )}

          {/* TAB 10: REPORTS */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <ReportsSubtab
                selectedHotel={filters.hotel || "all"}
                rawRecords={data.raw_records}
                onExportCsv={handleExportCsv}
                onExportExcel={handleExportExcel}
              />
              <DetailedDataTable
                records={data.raw_records}
                onExportCsv={handleExportCsv}
                onExportExcel={handleExportExcel}
              />
            </div>
          )}

          {/* TAB 11: DATA QUALITY */}
          {activeTab === "data_quality" && (
            <div className="space-y-6">
              <DataQualitySubtab
                selectedHotel={filters.hotel || "all"}
                report={data.data_quality}
                massBalanceAudit={data.mass_balance_audit}
              />
              <AuditAndDataQualitySection report={data.data_quality} />
            </div>
          )}
        </div>
      ) : null}

      {/* Modals */}
      <DishDetailModal
        dish={selectedDishDetail}
        onClose={() => setSelectedDishDetail(null)}
      />

      <ExcelUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
