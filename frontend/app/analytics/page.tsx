"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import {
  AnalyticsFilterParams,
  AnalyticsOverviewResponse,
  DishDrillDownDetail,
} from "@/types/analytics";

import { GlobalFilterBar } from "@/components/analytics/GlobalFilterBar";
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
} from "lucide-react";
import Link from "next/link";

const DEFAULT_FILTERS: AnalyticsFilterParams = {
  date_preset: "all",
  hotel: "all",
  service_type: "all",
  session: "all",
  event_id: "all",
  dish_category: "all",
  data_source: "all",
};

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [filters, setFilters] = useState<AnalyticsFilterParams>(DEFAULT_FILTERS);
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDishDetail, setSelectedDishDetail] = useState<DishDrillDownDetail | null>(null);
  const [loadingDishDrilldown, setLoadingDishDrilldown] = useState(false);

  // Fetch overview data
  const fetchAnalytics = useCallback(async () => {
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
      if (filters.dish_category && filters.dish_category !== "all") query.set("dish_category", filters.dish_category);
      if (filters.data_source && filters.data_source !== "all") query.set("data_source", filters.data_source);

      const res = await apiRequest<AnalyticsOverviewResponse>(
        `/api/analytics/overview?${query.toString()}`
      );
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load hospitality analytics");
    } finally {
      setLoading(false);
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
    if (!data?.raw_records || data.raw_records.length === 0) return;
    const headers = [
      "Date",
      "Hotel",
      "Event",
      "Session",
      "Dish Name",
      "Category",
      "Estimated (Kg)",
      "Cooked (Kg)",
      "Consumed (Kg)",
      "Leftover (Kg)",
      "Reused (Kg)",
      "Waste (Kg)",
      "Waste %",
      "Waste Cost (INR)",
      "Waste Per Head (g)",
    ];
    const rows = data.raw_records.map((r) => [
      `"${r.date}"`,
      `"${r.hotel}"`,
      `"${r.event_name || ""}"`,
      `"${r.session}"`,
      `"${r.dish_name.replace(/"/g, '""')}"`,
      `"${r.dish_category || ""}"`,
      r.estimated_production_kg.toFixed(2),
      r.actual_production_kg.toFixed(2),
      r.actual_consumption_kg.toFixed(2),
      r.total_leftover_kg.toFixed(2),
      r.reuse_quantity_kg.toFixed(2),
      r.total_waste_kg.toFixed(2),
      r.waste_percentage.toFixed(2),
      r.waste_cost.toFixed(2),
      r.waste_per_head_grams.toFixed(1),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Food_Waste_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    handleExportCsv();
  };

  if (authLoading || (loading && !data)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Loading Hospitality Intelligence...
          </h3>
          <p className="text-xs text-slate-400">
            Ingesting culinary production, leftover returns, and portion yield balances
          </p>
        </div>
      </div>
    );
  }

  const contextDisplay = data?.filter_context
    ? `Analytics for: ${data.filter_context.hotel_name} • ${data.filter_context.date_display} • ${data.filter_context.active_sessions}`
    : "Consolidated Operations Intelligence";

  return (
    <div className="space-y-8 pb-20">
      {/* Executive Header Banner */}
      <div className="rounded-2xl p-7 sm:p-9 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white border border-slate-800/80 shadow-xl relative overflow-hidden">
        {/* Subtle Ambient Emerald Aura */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Executive Food Intelligence & Yield Optimization
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Culinary Analytics & Waste Intelligence
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
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Upload className="w-4 h-4" />
              Upload Report (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Quick Navigation Tabs Switcher */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 w-fit no-print">
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all flex items-center gap-2"
        >
          <ChefHat className="w-3.5 h-3.5 text-slate-500" />
          Culinary Overview
        </Link>
        <button
          className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 shadow-xs border border-slate-200/80 flex items-center gap-2"
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
          Analytics Dashboard
        </button>
      </div>

      {/* Global Filter Bar */}
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
        isLoading={loading}
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

      {/* If Data is available, render all 12 analytical layers */}
      {data && (
        <>
          {/* 1. Executive KPI Cards Grid */}
          <ExecutiveKpiGrid kpis={data.kpis} />

          {/* 2. Management AI Insights & Executive Summary */}
          <ManagementInsightsSection
            executiveSummary={data.executive_summary}
            insights={data.insights}
          />

          {/* 3. Executive Waste Overview: Horizontal Food Flow & Composition */}
          <ExecutiveOverviewSection
            foodFlow={data.food_flow}
            wasteCostInr={data.financial_impact.total_waste_cost}
          />

          {/* 4. Date-Wise Daily Trends */}
          <DailyTrendsSection trends={data.daily_trends} />

          {/* 5. Session & Meal Shift Operations */}
          <SessionAnalyticsSection sessions={data.session_comparison} />

          {/* 6. Service Type Comparison (Buffet, À la carte, Banquet, Room Service) */}
          <ServiceTypeAnalyticsSection serviceTypes={data.service_type_comparison} />

          {/* 7. Banquet Event Performance Table with configurable thresholds */}
          <EventPerformanceSection events={data.event_performance} />

          {/* 8. Dish Intelligence & Yield Rankings */}
          <DishIntelligenceSection
            topWasted={data.top_wasted_dishes}
            consistent={data.consistent_dishes}
            overProduction={data.over_production_alerts}
            underProduction={data.under_production_alerts}
            onSelectDish={handleSelectDish}
          />

          {/* 9. Pareto 80/20 Analysis */}
          <ParetoSection
            paretoItems={data.pareto_analysis}
            totalWasteKg={data.kpis.total_food_waste_kg.current}
          />

          {/* 10. Waste Heatmap & Day-of-Week Trends */}
          <WasteHeatmapSection
            heatmapData={data.heatmap}
            dayOfWeekData={data.day_of_week_analysis}
          />

          {/* 11. Leftover Separation & Food Reuse Diversion */}
          <LeftoverReuseSection
            totalProductionKg={data.kpis.total_food_prepared_kg.current}
            buffetLeftoverKg={data.food_flow.buffet_leftover_kg}
            kitchenLeftoverKg={data.food_flow.kitchen_leftover_kg}
            totalLeftoverKg={data.food_flow.total_leftover_kg}
            reuseKg={data.food_flow.reuse_kg}
            finalWasteKg={data.food_flow.final_waste_kg}
          />

          {/* 12. Culinary Financial Impact & Savings Simulator */}
          <FinancialImpactSection financials={data.financial_impact} />

          {/* 13. Data Quality & Audit Lineage */}
          <AuditAndDataQualitySection report={data.data_quality} />

          {/* 14. Itemized Audit Ledger Data Table */}
          <DetailedDataTable
            records={data.raw_records}
            onExportCsv={handleExportCsv}
            onExportExcel={handleExportExcel}
          />
        </>
      )}

      {/* Empty State if raw_records is 0 */}
      {data && data.raw_records.length === 0 && (
        <div className="hotel-card p-12 bg-white border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-slate-800">
            No analytics available for the selected filters
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try expanding the date range, selecting "All Hotels", or clearing the category filters. You can also upload a new daily report.
          </p>
          <div className="pt-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <DishDetailModal
        dish={selectedDishDetail}
        onClose={() => setSelectedDishDetail(null)}
      />

      <ExcelUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={fetchAnalytics}
      />
    </div>
  );
}
