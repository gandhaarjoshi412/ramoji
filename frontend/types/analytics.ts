export type ServiceType =
  | "Buffet"
  | "À la carte"
  | "Dine-in"
  | "Room Service"
  | "Banquet / Event"
  | "Catering"
  | "Other";

export type SessionType =
  | "Breakfast"
  | "Lunch"
  | "Snacks"
  | "Dinner"
  | "Late Night"
  | "Other";

export type FoodCategory =
  | "Starters"
  | "Main Course"
  | "Rice"
  | "Bread"
  | "Desserts"
  | "Beverages"
  | "Salads"
  | "Snacks"
  | "Other";

export type DataSourceType =
  | "Excel Import"
  | "AI Detection"
  | "Manual Entry"
  | "API"
  | "Estimated / Derived";

export type PerformanceStatus =
  | "Excellent"
  | "Good"
  | "Moderate"
  | "Needs Attention"
  | "Critical";

export interface NormalizedFoodRecord {
  id: string | number;
  date: string; // YYYY-MM-DD
  hotel: string;
  property_location?: string;
  event_id?: string | number;
  event_name?: string;
  event_type?: string;
  service_type: ServiceType;
  session: SessionType | string;
  pax: number;
  dish_name: string;
  dish_category: FoodCategory | string;
  food_type?: string;
  uom: string; // Kg, Pcs, Ltr, pkt, etc.
  item_cost: number; // Cost per unit (e.g. per piece, per kg)
  standard_qty_per_portion?: number;
  conversion_factor?: number; // Conversion to kg
  estimated_production: number; // In native UOM or converted Kg
  estimated_production_kg: number;
  actual_production: number; // In native UOM or converted Kg
  actual_production_kg: number;
  over_production: number;
  over_production_kg: number;
  pickup_quantity: number;
  pickup_quantity_kg: number;
  kitchen_leftover: number;
  kitchen_leftover_kg: number;
  location_buffet_return: number;
  location_buffet_return_kg: number;
  reuse_quantity: number;
  reuse_quantity_kg: number;
  actual_consumption: number;
  actual_consumption_kg: number;
  total_leftover: number;
  total_leftover_kg: number;
  total_waste: number;
  total_waste_kg: number;
  waste_cost: number;
  waste_percentage: number;
  waste_per_head_grams: number;
  consumption_per_head_grams: number;
  production_per_head_grams: number;
  reuse_percentage: number;
  notes?: string;
  data_source: DataSourceType;
  ai_confidence?: number;
  source_file?: string;
  source_sheet?: string;
  source_row?: number;
  import_id?: string;
  confidence_score?: number;
  created_at: string;
}

export interface AnalyticsFilterParams {
  date_preset: string; // "today" | "yesterday" | "last_7" | "last_30" | "this_month" | "previous_month" | "all" | "custom"
  start_date?: string;
  end_date?: string;
  hotel: string; // "all" or specific hotel name
  property_location?: string;
  event_id?: string;
  event_type?: string;
  service_type?: string;
  session?: string;
  dish_category?: string;
  dish_name?: string;
  data_source?: string;
}

export interface MetricComparison {
  current: number;
  previous: number;
  delta: number;
  percentage_change: number; // e.g. -8.4%
  is_positive_improvement: boolean; // For waste, a reduction is positive!
}

export interface ExecutiveKpis {
  total_food_prepared_kg: MetricComparison;
  food_prepared_per_guest_g: MetricComparison;
  total_food_consumed_kg: MetricComparison;
  consumption_rate_pct: MetricComparison;
  consumption_per_guest_g: MetricComparison;
  total_food_waste_kg: MetricComparison;
  waste_rate_pct: MetricComparison;
  waste_per_guest_g: MetricComparison;
  total_leftover_kg: MetricComparison;
  kitchen_leftover_kg: MetricComparison;
  buffet_leftover_kg: MetricComparison;
  food_reused_kg: MetricComparison;
  reuse_rate_pct: MetricComparison;
  food_diverted_kg: MetricComparison;
  total_waste_cost: MetricComparison;
  waste_cost_per_guest: MetricComparison;
  waste_cost_pct_of_prepared: MetricComparison;
  production_variance_kg: MetricComparison;
  production_variance_pct: MetricComparison;
  total_guests: MetricComparison;
}

export interface FoodFlowStage {
  name: string;
  quantity_kg: number;
  percentage_of_prepared: number;
  description: string;
}

export interface FoodFlowData {
  estimated_kg: number;
  actual_production_kg: number;
  pickup_kg: number;
  actual_consumption_kg: number;
  kitchen_leftover_kg: number;
  buffet_leftover_kg: number;
  total_leftover_kg: number;
  reuse_kg: number;
  final_waste_kg: number;
  stages: FoodFlowStage[];
}

export interface DailyTrendPoint {
  date: string;
  production_kg: number;
  consumption_kg: number;
  waste_kg: number;
  leftover_kg: number;
  reuse_kg: number;
  waste_percentage: number;
  waste_per_guest_g: number;
  waste_cost: number;
  pax: number;
}

export interface SessionComparisonRow {
  session: string;
  pax: number;
  production_kg: number;
  consumption_kg: number;
  leftover_kg: number;
  reuse_kg: number;
  waste_kg: number;
  waste_percentage: number;
  waste_per_guest_g: number;
  waste_cost: number;
  is_worst_session: boolean;
}

export interface ServiceTypeComparisonRow {
  service_type: ServiceType | string;
  pax: number;
  production_kg: number;
  consumption_kg: number;
  leftover_kg: number;
  reuse_kg: number;
  waste_kg: number;
  waste_percentage: number;
  waste_per_guest_g: number;
  waste_cost: number;
}

export interface EventPerformanceRow {
  event_id: string | number;
  event_name: string;
  hotel: string;
  location?: string;
  event_date: string;
  event_type: string;
  service_type: string;
  pax: number;
  estimated_kg: number;
  actual_production_kg: number;
  consumption_kg: number;
  leftover_kg: number;
  reuse_kg: number;
  waste_kg: number;
  waste_percentage: number;
  waste_per_guest_g: number;
  waste_cost: number;
  performance_status: PerformanceStatus;
}

export interface DishIntelligenceRow {
  rank?: number;
  dish_name: string;
  category: string;
  occurrences: number;
  total_prepared_kg: number;
  total_consumed_kg: number;
  total_leftover_kg: number;
  total_reuse_kg: number;
  total_waste_kg: number;
  waste_percentage: number;
  waste_per_guest_g: number;
  total_waste_cost: number;
  production_variance_kg: number;
  production_variance_pct: number;
  consumption_rate_pct: number;
  is_over_produced: boolean;
  is_under_produced: boolean;
  is_consistent: boolean;
}

export interface DishDrillDownDetail {
  dish_name: string;
  category: string;
  total_prepared_kg: number;
  total_consumed_kg: number;
  total_waste_kg: number;
  waste_percentage: number;
  waste_per_guest_g: number;
  total_waste_cost: number;
  events_count: number;
  sessions_count: number;
  avg_prepared_kg: number;
  avg_consumed_kg: number;
  avg_waste_kg: number;
  avg_variance_kg: number;
  date_trends: {
    date: string;
    prepared_kg: number;
    consumed_kg: number;
    waste_kg: number;
    waste_percentage: number;
  }[];
  session_breakdown: {
    session: string;
    prepared_kg: number;
    consumed_kg: number;
    waste_kg: number;
    waste_percentage: number;
  }[];
  event_breakdown: {
    event_name: string;
    date: string;
    pax: number;
    prepared_kg: number;
    consumed_kg: number;
    waste_kg: number;
  }[];
  observation: string;
  recommendation: string;
}

export interface ParetoItem {
  dish_name: string;
  category: string;
  waste_kg: number;
  waste_percentage_of_total: number;
  cumulative_waste_percentage: number;
}

export interface HeatmapCell {
  day_or_date: string; // e.g. "Monday" or "2026-08-24"
  session: string;
  value: number; // intensity metric
  label: string;
  waste_kg: number;
  waste_pct: number;
  waste_per_guest_g: number;
  waste_cost: number;
}

export interface DayOfWeekMetric {
  day: string;
  avg_pax: number;
  avg_production_kg: number;
  avg_consumption_kg: number;
  avg_waste_kg: number;
  avg_waste_pct: number;
  avg_waste_per_guest_g: number;
}

export interface ManagementInsight {
  id: string;
  priority: "Critical" | "Attention" | "Performing Well" | "Information";
  category: string; // "Session" | "Dish" | "Event" | "Trend" | "Cost"
  title: string;
  observation: string;
  reason_metric: string;
  recommendation: string;
}

export interface DataQualityReport {
  overall_score_pct: number; // e.g. 98.2
  total_records: number;
  valid_records: number;
  warning_count: number;
  warnings: {
    record_id?: string | number;
    item?: string;
    issue: string;
    severity: "low" | "medium" | "high";
  }[];
  source_breakdown: {
    source: DataSourceType | string;
    count: number;
    percentage: number;
  }[];
  audit_info: {
    hotel: string;
    last_uploaded_at?: string;
    file_name?: string;
    uploaded_by?: string;
  };
}

export interface SavingsSimulatorTier {
  reduction_pct: number; // 10, 20, 30
  monthly_savings_inr: number;
  annual_savings_inr: number;
  waste_reduced_kg: number;
}

export interface FinancialImpactData {
  total_waste_cost: number;
  waste_cost_per_guest: number;
  waste_cost_per_kg: number;
  cost_consumed_per_guest: number;
  annualized_estimate_inr: number;
  monthly_estimate_inr: number;
  projection_disclaimer: string;
  savings_simulator: SavingsSimulatorTier[];
}

export interface AnalyticsOverviewResponse {
  filter_context: {
    hotel_name: string;
    date_display: string;
    active_sessions: string;
    active_service_types: string;
  };
  filter_options: {
    hotels: string[];
    sessions: string[];
    service_types: string[];
    event_types: string[];
    categories: string[];
    events: { id: string | number; name: string }[];
  };
  executive_summary: string;
  kpis: ExecutiveKpis;
  food_flow: FoodFlowData;
  daily_trends: DailyTrendPoint[];
  session_comparison: SessionComparisonRow[];
  service_type_comparison: ServiceTypeComparisonRow[];
  event_performance: EventPerformanceRow[];
  top_wasted_dishes: DishIntelligenceRow[];
  consistent_dishes: DishIntelligenceRow[];
  over_production_alerts: DishIntelligenceRow[];
  under_production_alerts: DishIntelligenceRow[];
  pareto_analysis: ParetoItem[];
  heatmap: HeatmapCell[];
  day_of_week_analysis: DayOfWeekMetric[];
  financial_impact: FinancialImpactData;
  insights: ManagementInsight[];
  data_quality: DataQualityReport;
  raw_records: NormalizedFoodRecord[];
}

export interface UploadConfirmSummaryDish {
  dish_name: string;
  category: string;
  production_kg: number;
  waste_kg: number;
  waste_cost: number;
  session: string;
}

export interface UploadConfirmSummary {
  hotels: string[];
  dates: string[];
  events: string[];
  sessions: string[];
  service_types: string[];
  dishes_count: number;
  total_production_kg: number;
  total_consumption_kg: number;
  total_leftover_kg: number;
  total_waste_kg: number;
  total_waste_cost: number;
  total_reuse_kg: number;
  waste_percentage: number;
  top_waste_dishes: UploadConfirmSummaryDish[];
  replaced_records: number;
  duplicate_action: string;
  imported_at: string;
}

export interface UploadConfirmResponse {
  status: "success" | "skipped" | "error";
  import_id?: string;
  inserted_records: number;
  filename: string;
  sheet_name?: string;
  message?: string;
  warnings?: string[];
  summary?: UploadConfirmSummary;
}
