export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "staff" | string;
  hotel_id: number;
  hotel_name?: string;
  created_at: string;
}

export interface Ingredient {
  id: number;
  hotel_id: number;
  name: string;
  unit: string;
  cost_per_unit: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  ingredient_id: number;
  quantity: number;
  unit: string;
  ingredient?: Ingredient;
}

export interface Recipe {
  id: number;
  hotel_id: number;
  food_item_id?: number;
  food_item_name?: string;
  name: string;
  expected_yield_grams: number;
  notes?: string;
  total_batch_cost: number;
  cost_per_gram: number;
  ingredients: RecipeIngredient[];
  created_at: string;
  updated_at: string;
}

export interface FoodItem {
  id: number;
  hotel_id: number;
  name: string;
  category: string;
  default_unit: string;
  default_cost_per_kg: number;
  cost_per_kg?: number;
  density_g_per_cm3: number;
  default_depth_cm: number;
  portion_scaling_factor: number;
  min_estimated_weight_g: number;
  max_estimated_weight_g: number;
  calibration_factor: number;
  recipe_id?: number;
  cost_per_gram: number;
  created_at: string;
}

export interface WasteScan {
  id: number;
  event_id: number;
  food_item_id?: number;
  image_url: string;
  created_at: string;
  ai_food_prediction: string;
  ai_confidence: number;
  bounding_box?: number[];
  segmentation_mask?: number[][];
  estimated_weight_grams: number;
  estimation_confidence: number;
  measurement_method: string;
  cost_per_gram: number;
  estimated_waste_cost: number;
  ai_model_name: string;
  ai_model_version: string;
  human_verified: boolean;
  human_food_correction?: string;
  human_weight_correction?: number;
  is_low_confidence: boolean;
  notes?: string;
  final_food_name: string;
  final_weight_grams: number;
  final_waste_cost: number;
  // Compatibility & convenience aliases:
  final_food_id?: number;
  final_weight_kg?: number;
  estimated_weight_kg?: number;
  estimated_cost?: number;
  density_factor?: number;
  correction_notes?: string;
}

export interface EventFood {
  id: number;
  event_id: number;
  food_item_id: number;
  food_item_name: string;
  food_item_category: string;
  food_item_unit: string;
  prepared_weight_kg: number;
  estimated_cost_per_kg: number;
  notes?: string;
  net_waste_kg: number;
  waste_percentage: number;
  waste_cost: number;
}

export interface EventListItem {
  id: number;
  hotel_id: number;
  name: string;
  event_type: string;
  venue?: string;
  event_date: string;
  expected_guests: number;
  actual_guests: number;
  status: "Upcoming" | "Active" | "Completed" | string;
  notes?: string;
  created_at: string;
  updated_at: string;
  total_prepared_kg: number;
  total_waste_kg: number;
  waste_percentage: number;
  total_waste_cost: number;
  waste_per_guest_kg: number;
  waste_per_guest_grams: number;
  food_items_count: number;
}

export interface EventDetail extends EventListItem {
  event_foods: EventFood[];
}

export interface TopWasteFood {
  food_name: string;
  category: string;
  total_waste_kg: number;
  total_waste_cost: number;
  scans_count: number;
}

export interface WasteByEventItem {
  event_id: number;
  event_name: string;
  event_date: string;
  event_type: string;
  status?: string;
  actual_guests: number;
  total_waste_kg: number;
  total_waste_cost: number;
  scans_count: number;
}

export interface WasteTrendPoint {
  date: string;
  event_name: string;
  waste_kg: number;
  waste_cost: number;
}

export interface DashboardSummary {
  total_events: number;
  completed_events: number;
  active_events: number;
  upcoming_events: number;
  total_scans: number;
  total_guests_served: number;
  total_food_prepared_kg?: number;
  total_prepared_kg?: number;
  total_estimated_waste_kg: number;
  total_waste_kg?: number;
  total_estimated_waste_cost: number;
  total_waste_cost?: number;
  overall_waste_percentage?: number;
  average_waste_per_guest_grams: number;
  average_ai_confidence: number;
  human_corrections_count: number;
  top_wasted_foods: TopWasteFood[];
  waste_by_event: WasteByEventItem[];
  waste_trends: WasteTrendPoint[];
}

export interface EventFoodWasteSummary {
  food_name: string;
  category: string;
  total_waste_grams: number;
  total_waste_kg: number;
  total_waste_cost: number;
  scans_count: number;
}

export interface EventAnalytics {
  event_id: number;
  event_name: string;
  event_date: string;
  event_type: string;
  venue?: string;
  expected_guests: number;
  actual_guests: number;
  status: string;
  total_scans_count: number;
  total_estimated_waste_kg: number;
  total_estimated_waste_grams: number;
  total_estimated_waste_cost: number;
  waste_per_guest_grams: number;
  average_ai_confidence: number;
  human_corrections_count: number;
  food_breakdown: EventFoodWasteSummary[];
  scans: WasteScan[];
}

export interface SettingsData {
  hotel_name: string;
  hotel_address: string;
  ai_mode: string;
  ai_confidence_threshold: number;
  ai_model_name: string;
  ai_model_version: string;
  storage_provider: string;
  user_role: string;
}

export interface TrainingDataExportItem {
  scan_id: number;
  image_url: string;
  ai_prediction: string;
  ai_confidence: number;
  human_correction?: string;
  final_food_label: string;
  estimated_weight_g: number;
  final_weight_g: number;
  event_name: string;
  timestamp: string;
}

export interface WasteReasonSummary {
  reason: string;
  total_waste_kg: number;
  percentage: number;
  records_count: number;
}

export interface ReportFoodItem {
  food_name: string;
  category: string;
  prepared_kg: number;
  leftover_kg: number;
  waste_percentage: number;
  cost_per_kg: number;
  waste_cost: number;
  primary_reason?: string;
  notes?: string;
}

export interface EventReport {
  hotel_name: string;
  hotel_address?: string;
  generated_at: string;
  event_id: number;
  event_name: string;
  event_type: string;
  venue?: string;
  event_date: string;
  expected_guests: number;
  actual_guests: number;
  status: string;
  total_food_prepared_kg: number;
  total_food_waste_kg: number;
  waste_rate_percentage: number;
  waste_per_guest_grams: number;
  waste_per_guest_kg: number;
  estimated_waste_cost: number;
  food_breakdown: ReportFoodItem[];
  waste_reasons_breakdown: WasteReasonSummary[];
  disclaimer: string;
}

export interface WasteRecord {
  id: number;
  event_food_id: number;
  gross_weight_kg: number;
  container_weight_kg: number;
  net_weight_kg: number;
  waste_reason: string;
  notes?: string;
  recorded_by?: number;
  recorded_by_name?: string;
  recorded_at: string;
  weight_source: string;
  image_url?: string;
}
