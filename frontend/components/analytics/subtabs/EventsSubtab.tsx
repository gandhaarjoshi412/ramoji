"use client";

import React, { useEffect, useState, useMemo } from "react";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  X,
  Building2,
  Users,
  UtensilsCrossed,
  ArrowRight,
  RotateCcw,
  BarChart3,
  PieChart,
  Printer,
  ExternalLink,
  Sparkles,
  TrendingDown,
  ArrowUpRight,
  Leaf,
  DollarSign,
  ChefHat,
  Flame,
  ShieldAlert,
  Award,
  Layers,
  SlidersHorizontal,
  Download,
  Info,
  Clock,
  Check,
  Droplets,
} from "lucide-react";
import { CrossEventComparisonSection } from "@/components/analytics/CrossEventComparisonSection";
import { EventTypeIntelligenceWorkspace } from "@/components/analytics/EventTypeIntelligenceWorkspace";
import { CrossEventComparison, EventTypesAnalyticsResponse } from "@/types/analytics";


interface EventItem {
  id: number;
  hotel_id: number;
  hotel_name?: string;
  name: string;
  event_type: string;
  event_subtype?: string;
  client_name?: string;
  venue?: string;
  service_format?: string;
  event_date: string;
  expected_guests: number;
  actual_guests: number;
  status: string;
  is_archived?: boolean;
  notes?: string;
  total_prepared_kg: number;
  total_consumed_kg: number;
  total_leftover_kg: number;
  total_reuse_kg: number;
  total_waste_kg: number;
  waste_percentage: number;
  total_waste_cost: number;
  waste_per_guest_grams: number;
  food_items_count: number;
  data_completeness_pct: number;
}

interface DeleteImpact {
  event_id: number;
  event_name: string;
  hotel_name: string;
  event_date: string;
  food_items_count: number;
  waste_scans_count: number;
  analytics_records_count: number;
  message: string;
}

interface EventsSubtabProps {
  selectedHotel: string;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
  selectedEventType?: string;
  onSelectEvent?: (eventId: string) => void;
}

export const EventsSubtab: React.FC<EventsSubtabProps> = ({
  selectedHotel,
  datePreset = "all",
  startDate,
  endDate,
  selectedEventType,
  onSelectEvent,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [crossEventData, setCrossEventData] = useState<CrossEventComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState(selectedEventType && selectedEventType !== "all" ? selectedEventType : "all");
  const [showArchived, setShowArchived] = useState(false);
  const [applyDateFilter, setApplyDateFilter] = useState<boolean>(datePreset !== "all");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalEvent, setDeleteModalEvent] = useState<EventItem | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null);
  const [loadingDeleteImpact, setLoadingDeleteImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Event Deep-Dive Detail Inspection Modal
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<EventItem | null>(null);
  const [detailFullData, setDetailFullData] = useState<any | null>(null);
  const [loadingDetailFull, setLoadingDetailFull] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Dish Table Filter & Sort States in Modal
  const [dishSearchTerm, setDishSearchTerm] = useState("");
  const [dishCategoryFilter, setDishCategoryFilter] = useState("all");
  const [dishSessionFilter, setDishSessionFilter] = useState("all");
  const [dishFoodTypeFilter, setDishFoodTypeFilter] = useState("all");
  const [dishSortBy, setDishSortBy] = useState<"waste_desc" | "cost_desc" | "prep_desc" | "pct_desc">("waste_desc");

  // Menu Planning Planner State (Part 5)
  const [plannerPax, setPlannerPax] = useState<number>(140);
  const [plannerBuffer, setPlannerBuffer] = useState<number>(10);

  // Computed modal metrics ensuring 100% data consistency
  const effectivePrepKg = detailFullData?.total_prepared_kg ?? selectedDetailEvent?.total_prepared_kg ?? 0;
  const effectiveConsumedKg = detailFullData?.total_consumed_kg ?? selectedDetailEvent?.total_consumed_kg ?? 0;
  const effectiveReuseKg = detailFullData?.total_reuse_kg ?? selectedDetailEvent?.total_reuse_kg ?? 0;
  const effectiveLeftoverKg = detailFullData?.total_leftover_kg ?? selectedDetailEvent?.total_leftover_kg ?? 0;
  const effectiveWasteKg = detailFullData?.total_waste_kg ?? selectedDetailEvent?.total_waste_kg ?? 0;
  const effectiveWasteCost = detailFullData?.total_waste_cost ?? selectedDetailEvent?.total_waste_cost ?? 0;
  const effectiveWastePct = detailFullData?.waste_percentage ?? selectedDetailEvent?.waste_percentage ?? (effectivePrepKg > 0 ? (effectiveWasteKg / effectivePrepKg) * 100 : 0);
  const effectivePax = detailFullData?.actual_guests || selectedDetailEvent?.actual_guests || selectedDetailEvent?.expected_guests || 1;
  const effectiveWastePerGuest = detailFullData?.waste_per_guest_grams ?? selectedDetailEvent?.waste_per_guest_grams ?? (effectivePax > 0 ? (effectiveWasteKg / effectivePax) * 1000 : 0);
  const effectiveIntakePerGuest = effectivePax > 0 ? (effectiveConsumedKg / effectivePax) * 1000 : 0;
  const effectiveYieldPct = effectivePrepKg > 0 ? ((effectiveConsumedKg / effectivePrepKg) * 100) : 100;
  const potentialSavings = Math.round(effectiveWasteCost * 0.18);
  const carbonFootprintKg = Number((effectiveWasteKg * 2.5).toFixed(1));
  const waterFootprintLiters = Math.round(effectiveWasteKg * 1500);
  const mealEquivalentsLost = Math.round(effectiveWasteKg / 0.4);
  const diversionRatePct = effectiveLeftoverKg > 0 ? ((effectiveReuseKg / effectiveLeftoverKg) * 100) : 0;
  const effectiveDishesCount = detailFullData?.event_foods?.length ?? selectedDetailEvent?.food_items_count ?? 0;

  const distinctCategories = useMemo(() => {
    if (!detailFullData?.event_foods) return [];
    const set = new Set<string>();
    detailFullData.event_foods.forEach((f: any) => {
      if (f.food_item_category) set.add(f.food_item_category);
    });
    return Array.from(set).sort();
  }, [detailFullData]);

  const distinctSessions = useMemo(() => {
    if (!detailFullData?.event_foods) return [];
    const set = new Set<string>();
    detailFullData.event_foods.forEach((f: any) => {
      if (f.session) set.add(f.session);
    });
    return Array.from(set).sort();
  }, [detailFullData]);

  const sessionAnalytics = useMemo(() => {
    if (!detailFullData?.event_foods || detailFullData.event_foods.length === 0) return [];
    const map = new Map<string, { session: string; prepared_kg: number; consumed_kg: number; waste_kg: number; waste_cost: number; count: number }>();
    for (const f of detailFullData.event_foods) {
      const sess = f.session || "Main Service";
      const existing = map.get(sess) || { session: sess, prepared_kg: 0, consumed_kg: 0, waste_kg: 0, waste_cost: 0, count: 0 };
      const prep = Number(f.prepared_weight_kg) || 0;
      const waste = Number(f.net_waste_kg) || 0;
      const cost = Number(f.waste_cost) || 0;
      const cons = Number(f.consumed_weight_kg) || Math.max(0, prep - waste);
      existing.prepared_kg += prep;
      existing.consumed_kg += cons;
      existing.waste_kg += waste;
      existing.waste_cost += cost;
      existing.count += 1;
      map.set(sess, existing);
    }
    return Array.from(map.values());
  }, [detailFullData]);

  const categoryAnalytics = useMemo(() => {
    if (!detailFullData?.event_foods || detailFullData.event_foods.length === 0) return [];
    const sourceDishes = dishSessionFilter === "all"
      ? detailFullData.event_foods
      : detailFullData.event_foods.filter((f: any) => f.session === dishSessionFilter);

    const map = new Map<string, { category: string; prepared_kg: number; consumed_kg: number; waste_kg: number; waste_cost: number; count: number }>();
    for (const f of sourceDishes) {
      const cat = f.food_item_category || "Main Course";
      const existing = map.get(cat) || { category: cat, prepared_kg: 0, consumed_kg: 0, waste_kg: 0, waste_cost: 0, count: 0 };
      const prep = Number(f.prepared_weight_kg) || 0;
      const waste = Number(f.net_waste_kg) || 0;
      const cost = Number(f.waste_cost) || 0;
      const cons = Number(f.consumed_weight_kg) || Math.max(0, prep - waste);
      existing.prepared_kg += prep;
      existing.consumed_kg += cons;
      existing.waste_kg += waste;
      existing.waste_cost += cost;
      existing.count += 1;
      map.set(cat, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.waste_cost - a.waste_cost);
  }, [detailFullData, dishSessionFilter]);

  const foodTypeAnalytics = useMemo(() => {
    if (!detailFullData?.event_foods) return null;
    let vegPrep = 0, vegWaste = 0, vegCost = 0, vegCount = 0;
    let nonVegPrep = 0, nonVegWaste = 0, nonVegCost = 0, nonVegCount = 0;
    for (const f of detailFullData.event_foods) {
      const prep = Number(f.prepared_weight_kg) || 0;
      const waste = Number(f.net_waste_kg) || 0;
      const cost = Number(f.waste_cost) || 0;
      if (f.food_type === "Non-Veg") {
        nonVegPrep += prep;
        nonVegWaste += waste;
        nonVegCost += cost;
        nonVegCount++;
      } else {
        vegPrep += prep;
        vegWaste += waste;
        vegCost += cost;
        vegCount++;
      }
    }
    return {
      veg: { count: vegCount, prep_kg: vegPrep, waste_kg: vegWaste, cost: vegCost, waste_pct: vegPrep > 0 ? (vegWaste / vegPrep) * 100 : 0 },
      nonVeg: { count: nonVegCount, prep_kg: nonVegPrep, waste_kg: nonVegWaste, cost: nonVegCost, waste_pct: nonVegPrep > 0 ? (nonVegWaste / nonVegPrep) * 100 : 0 },
    };
  }, [detailFullData]);

  const topWastedDishes = useMemo(() => {
    if (!detailFullData?.event_foods) return [];
    const source = dishSessionFilter === "all"
      ? detailFullData.event_foods
      : detailFullData.event_foods.filter((f: any) => f.session === dishSessionFilter);
    return [...source]
      .sort((a, b) => (b.waste_cost || 0) - (a.waste_cost || 0) || (b.net_waste_kg || 0) - (a.net_waste_kg || 0))
      .slice(0, 4);
  }, [detailFullData, dishSessionFilter]);

  const zeroWasteDishes = useMemo(() => {
    if (!detailFullData?.event_foods) return [];
    const source = dishSessionFilter === "all"
      ? detailFullData.event_foods
      : detailFullData.event_foods.filter((f: any) => f.session === dishSessionFilter);
    return source
      .filter((f: any) => (f.net_waste_kg || 0) <= 0.2 && (f.prepared_weight_kg || 0) > 0)
      .slice(0, 4);
  }, [detailFullData, dishSessionFilter]);

  const filteredDishes = useMemo(() => {
    if (!detailFullData?.event_foods) return [];
    return detailFullData.event_foods
      .filter((f: any) => {
        const matchesSearch = !dishSearchTerm.trim() || f.food_item_name?.toLowerCase().includes(dishSearchTerm.toLowerCase());
        const matchesCat = dishCategoryFilter === "all" || f.food_item_category === dishCategoryFilter;
        const matchesSession = dishSessionFilter === "all" || f.session === dishSessionFilter;
        const matchesType = dishFoodTypeFilter === "all" || (f.food_type && f.food_type.toLowerCase() === dishFoodTypeFilter.toLowerCase());
        return matchesSearch && matchesCat && matchesSession && matchesType;
      })
      .sort((a: any, b: any) => {
        if (dishSortBy === "waste_desc") return (b.net_waste_kg || 0) - (a.net_waste_kg || 0);
        if (dishSortBy === "cost_desc") return (b.waste_cost || 0) - (a.waste_cost || 0);
        if (dishSortBy === "prep_desc") return (b.prepared_weight_kg || 0) - (a.prepared_weight_kg || 0);
        if (dishSortBy === "pct_desc") return (b.waste_percentage || 0) - (a.waste_percentage || 0);
        return 0;
      });
  }, [detailFullData, dishSearchTerm, dishCategoryFilter, dishSessionFilter, dishFoodTypeFilter, dishSortBy]);

  const filteredDishesSummary = useMemo(() => {
    let prep = 0, cons = 0, leftover = 0, reuse = 0, waste = 0, cost = 0;
    for (const f of filteredDishes) {
      const p = Number(f.prepared_weight_kg) || 0;
      const w = Number(f.net_waste_kg) || 0;
      const c = Number(f.consumed_weight_kg) || Math.max(0, p - w);
      const l = Number(f.leftover_weight_kg) || w;
      const r = Number(f.reused_weight_kg) || 0;
      prep += p;
      cons += c;
      leftover += l;
      reuse += r;
      waste += w;
      cost += Number(f.waste_cost) || 0;
    }
    return {
      count: filteredDishes.length,
      prep_kg: prep,
      consumed_kg: cons,
      leftover_kg: leftover,
      reused_kg: reuse,
      waste_kg: waste,
      cost_loss: cost,
      waste_pct: prep > 0 ? (waste / prep) * 100 : 0,
    };
  }, [filteredDishes]);

  const exportDishLedgerCSV = () => {
    if (!filteredDishes || filteredDishes.length === 0) return;
    const headers = ["Dish Name", "Category", "Food Type", "Session", "Prepared (kg)", "Consumed (kg)", "Discarded Waste (kg)", "Waste %", "Cost Loss (INR)", "Notes"];
    const rows = filteredDishes.map((f: any) => [
      `"${(f.food_item_name || "").replace(/"/g, '""')}"`,
      `"${(f.food_item_category || "").replace(/"/g, '""')}"`,
      `"${(f.food_type || "Veg").replace(/"/g, '""')}"`,
      `"${(f.session || "Service").replace(/"/g, '""')}"`,
      (f.prepared_weight_kg || 0).toFixed(2),
      (f.consumed_weight_kg || Math.max(0, (f.prepared_weight_kg || 0) - (f.net_waste_kg || 0))).toFixed(2),
      (f.net_waste_kg || 0).toFixed(2),
      ((f.waste_percentage || 0)).toFixed(1) + "%",
      (f.waste_cost || 0).toFixed(2),
      `"${(f.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${(selectedDetailEvent?.name || "Event").replace(/[^a-zA-Z0-9_-]/g, "_")}_dish_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Create Event Form state (Part 2: 4 Default Categories: Corporate, Conference, Social, Wedding + Custom)
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [hotelId, setHotelId] = useState(1);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [eventType, setEventType] = useState<string>("Corporate");
  const [customEventTypeName, setCustomEventTypeName] = useState("");
  const [eventSubtype, setEventSubtype] = useState("Annual Conference");
  const [clientName, setClientName] = useState("");
  const [serviceFormat, setServiceFormat] = useState("Buffet");
  const [venue, setVenue] = useState("Grand Ballroom");
  const [expectedPax, setExpectedPax] = useState(150);
  const [actualPax, setActualPax] = useState(140);
  const [notes, setNotes] = useState("");

  // Dishes state in Create Event
  const [dishes, setDishes] = useState<
    {
      dish_name: string;
      session: string;
      category: string;
      prepared_kg: number;
      consumed_kg: number;
      leftover_kg: number;
      reuse_kg: number;
      waste_kg: number;
      waste_cost: number;
      item_cost: number;
    }[]
  >([
    {
      dish_name: "Paneer Butter Masala",
      session: "Lunch",
      category: "Main Course",
      prepared_kg: 25.0,
      consumed_kg: 21.0,
      leftover_kg: 4.0,
      reuse_kg: 2.0,
      waste_kg: 2.0,
      waste_cost: 480.0,
      item_cost: 240.0,
    },
    {
      dish_name: "Jeera Rice",
      session: "Lunch",
      category: "Rice",
      prepared_kg: 30.0,
      consumed_kg: 26.5,
      leftover_kg: 3.5,
      reuse_kg: 1.5,
      waste_kg: 2.0,
      waste_cost: 220.0,
      item_cost: 110.0,
    },
  ]);

  const [savingEvent, setSavingEvent] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (selectedHotel && selectedHotel !== "all") query.set("hotel", selectedHotel);
      if (showArchived) query.set("include_archived", "true");
      if (filterType !== "all") query.set("event_type", filterType);

      // Part 1 Problem A: Date synchronization
      if (applyDateFilter && datePreset !== "all") {
        const today = new Date();
        const fmt = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        if (datePreset === "today") {
          const t = fmt(today);
          query.set("date_from", t);
          query.set("date_to", t);
        } else if (datePreset === "yesterday") {
          const y = new Date(today);
          y.setDate(today.getDate() - 1);
          const yStr = fmt(y);
          query.set("date_from", yStr);
          query.set("date_to", yStr);
        } else if (datePreset === "last_7") {
          const l7 = new Date(today);
          l7.setDate(today.getDate() - 7);
          query.set("date_from", fmt(l7));
          query.set("date_to", fmt(today));
        } else if (datePreset === "last_30") {
          const l30 = new Date(today);
          l30.setDate(today.getDate() - 30);
          query.set("date_from", fmt(l30));
          query.set("date_to", fmt(today));
        } else if (datePreset === "custom" && startDate && endDate) {
          query.set("date_from", startDate);
          query.set("date_to", endDate);
        }
      }

      const res = await apiRequest<EventItem[]>(`/api/events?${query.toString()}`);
      setEvents(res);
    } catch (err: any) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedHotel, showArchived, filterType, applyDateFilter, datePreset, startDate, endDate]);

  useEffect(() => {
    async function loadCrossEvent() {
      try {
        const query = new URLSearchParams();
        if (selectedHotel && selectedHotel !== "all") query.set("hotel", selectedHotel);
        if (datePreset) query.set("date_preset", datePreset);
        if (startDate) query.set("start_date", startDate);
        if (endDate) query.set("end_date", endDate);
        const res = await apiRequest<EventTypesAnalyticsResponse>(`/api/analytics/event-types?${query.toString()}`);
        if (res?.cross_event_comparison) {
          setCrossEventData(res.cross_event_comparison);
        }
      } catch {
        // Fallback silently
      }
    }
    loadCrossEvent();
  }, [selectedHotel, datePreset, startDate, endDate]);

  const handleOpenDelete = async (ev: EventItem) => {
    setDeleteModalEvent(ev);
    setLoadingDeleteImpact(true);
    setDeleteImpact(null);
    try {
      const impact = await apiRequest<DeleteImpact>(`/api/events/${ev.id}/delete-impact`);
      setDeleteImpact(impact);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDeleteImpact(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalEvent) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/events/${deleteModalEvent.id}`, { method: "DELETE" });
      setDeleteModalEvent(null);
      fetchEvents();
    } catch (err: any) {
      alert("Failed to delete event: " + (err.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const handleRestoreEvent = async (evId: number) => {
    try {
      await apiRequest(`/api/events/${evId}/restore`, { method: "POST" });
      fetchEvents();
    } catch (err: any) {
      alert("Failed to restore event: " + err.message);
    }
  };

  // Add Dish Row to Create Event
  const handleAddDishRow = () => {
    setDishes((prev) => [
      ...prev,
      {
        dish_name: "",
        session: "Lunch",
        category: "Main Course",
        prepared_kg: 10.0,
        consumed_kg: 8.5,
        leftover_kg: 1.5,
        reuse_kg: 0.5,
        waste_kg: 1.0,
        waste_cost: 150.0,
        item_cost: 150.0,
      },
    ]);
  };

  const handleRemoveDishRow = (idx: number) => {
    setDishes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDishChange = (idx: number, field: string, val: any) => {
    setDishes((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      // Auto compute leftover if prepared & consumed change
      if (field === "prepared_kg" || field === "consumed_kg") {
        const prep = Number(field === "prepared_kg" ? val : copy[idx].prepared_kg) || 0;
        const cons = Number(field === "consumed_kg" ? val : copy[idx].consumed_kg) || 0;
        copy[idx].leftover_kg = Math.max(0, Number((prep - cons).toFixed(2)));
      }
      return copy;
    });
  };

  const handleOpenDetail = async (ev: EventItem) => {
    setSelectedDetailEvent(ev);
    setDetailError(null);
    setPlannerPax(ev.actual_guests || ev.expected_guests || 100);
    setPlannerBuffer(10);
    setDishSearchTerm("");
    setDishCategoryFilter("all");
    setDishSessionFilter("all");
    setDishFoodTypeFilter("all");
    setDishSortBy("waste_desc");
    setLoadingDetailFull(true);
    setDetailFullData(null);
    try {
      const res = await apiRequest<any>(`/api/events/${ev.id}`);
      setDetailFullData(res);
      if (res && (res.actual_guests || res.expected_guests)) {
        setPlannerPax(res.actual_guests || res.expected_guests);
      }
    } catch (err: any) {
      console.error("Failed to load event detailed analytics:", err);
      setDetailError(err.message || "Failed to load individual dish quantities");
    } finally {
      setLoadingDetailFull(false);
    }
  };


  // Submit Create Event
  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEvent(true);
    setCreateError(null);

    // Validate mass balance across dish items
    for (const d of dishes) {
      if (!d.dish_name.trim()) {
        setCreateError("Please provide names for all dish entries.");
        setSavingEvent(false);
        return;
      }
      const left = Number(d.leftover_kg) || 0;
      const reuse = Number(d.reuse_kg) || 0;
      const waste = Number(d.waste_kg) || 0;
      if (Math.abs(left - (reuse + waste)) > 0.05) {
        setCreateError(
          `Mass balance discrepancy in "${d.dish_name}": Leftovers (${left} kg) must equal Reused (${reuse} kg) + Waste (${waste} kg).`
        );
        setSavingEvent(false);
        return;
      }
    }

    try {
      const finalType = eventType === "Custom" ? (customEventTypeName.trim() || "Custom Event") : eventType;
      const payload = {
        hotel_id: hotelId,
        name: eventName,
        event_date: eventDate,
        event_type: finalType,
        event_subtype: eventSubtype,
        client_name: clientName || undefined,
        service_format: serviceFormat,
        venue,
        expected_guests: Number(expectedPax),
        actual_guests: Number(actualPax),
        notes: notes || undefined,
        dishes: dishes.map((d) => ({
          name: d.dish_name,
          category: d.category,
          session: d.session,
          prepared_weight_kg: Number(d.prepared_kg),
          consumed_weight_kg: Number(d.consumed_kg),
          leftover_weight_kg: Number(d.leftover_kg),
          reuse_weight_kg: Number(d.reuse_kg),
          waste_weight_kg: Number(d.waste_kg),
          waste_cost: Number(d.waste_cost),
          cost_per_kg: Number(d.item_cost),
        })),
      };

      await apiRequest("/api/events", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setCreateModalOpen(false);
      setFormStep(1);
      fetchEvents();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create event");
    } finally {
      setSavingEvent(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.client_name && e.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.hotel_name && e.hotel_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSearch;
  });

  // Calculate compact summary indicators (Section 4.2)
  const totalGuestsServed = filteredEvents.reduce((acc, e) => acc + (e.actual_guests || e.expected_guests || 0), 0);
  const totalPreparedKg = filteredEvents.reduce((acc, e) => acc + (e.total_prepared_kg || 0), 0);
  const totalDiscardedKg = filteredEvents.reduce((acc, e) => acc + (e.total_waste_kg || 0), 0);
  const totalLossCost = filteredEvents.reduce((acc, e) => acc + (e.total_waste_cost || 0), 0);
  const recordsNeedingReview = filteredEvents.filter((e) => {
    const completeness = e.data_completeness_pct ?? 100;
    const wastePct = e.waste_percentage ?? 0;
    return completeness < 80 || wastePct > 25;
  }).length;

  // Pagination for Events Table
  const [eventsPage, setEventsPage] = useState<number>(1);
  const [eventsPerPage, setEventsPerPage] = useState<number>(8);

  useEffect(() => {
    setEventsPage(1);
  }, [searchTerm, filterType, showArchived, applyDateFilter, selectedHotel, datePreset]);

  const totalEventsPages = Math.max(1, Math.ceil(filteredEvents.length / eventsPerPage));
  const paginatedEvents = useMemo(() => {
    const start = (eventsPage - 1) * eventsPerPage;
    return filteredEvents.slice(start, start + eventsPerPage);
  }, [filteredEvents, eventsPage, eventsPerPage]);

  return (
    <div className="space-y-6">
      {/* Header Bar (Part 4.1) */}
      <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 mb-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              Banquet Operations & Food Intelligence
            </div>
            <h2 className="font-serif text-2xl font-bold text-slate-900 tracking-tight">
              Event Intelligence & Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Review individual event performance, manage operational records, and identify opportunities to reduce food waste.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        </div>

        {/* Date Scope Synchronization Alert / Toggle (Part 1 Problem A) */}
        {datePreset !== "all" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <span className={`w-2 h-2 rounded-full ${applyDateFilter ? "bg-emerald-500" : "bg-slate-400"}`} />
              <span>
                Scope: <strong>{datePreset.toUpperCase()}</strong> ({filteredEvents.length} events matching scope)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setApplyDateFilter(!applyDateFilter)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
              >
                {applyDateFilter ? "Show All Historical Events" : "Re-apply Date Scope"}
              </button>
            </div>
          </div>
        )}

        {/* 4.2 Compact Row of Summary Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Events Listed</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">{filteredEvents.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Guests Served</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
              {totalGuestsServed.toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Prepared Food</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
              {formatKg(totalPreparedKg)}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Discarded Waste</span>
            <span className="text-lg font-bold font-mono text-rose-700 mt-0.5 block">
              {formatKg(totalDiscardedKg)}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Waste Cost</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
              {formatINR(totalLossCost)}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Needs Review</span>
            <span className={`text-lg font-bold font-mono mt-0.5 block ${recordsNeedingReview > 0 ? "text-amber-700" : "text-slate-400"}`}>
              {recordsNeedingReview}
            </span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search event name, client, hotel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            {/* Part 2: 4 Default Categories: Corporate, Conference, Social, Wedding + Custom */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs py-2 px-3 border border-slate-200 rounded-xl bg-white focus:outline-hidden text-slate-700 font-medium"
            >
              <option value="all">All Event Categories</option>
              <option value="Corporate">Corporate</option>
              <option value="Conference">Conference</option>
              <option value="Social">Social</option>
              <option value="Wedding">Wedding</option>
              <option value="Custom">Custom Categories</option>
            </select>

            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Include Archived</span>
            </label>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="hotel-card bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading event records...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="font-serif text-sm font-bold text-slate-800">
              No matching events found
            </h4>
            <p className="text-xs text-slate-400">
              Try adjusting your search filters or click "Create Event" to enter a new banquet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70 font-semibold">
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4">Hotel & Venue</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Guests (Pax)</th>
                  <th className="py-3 px-4 text-right">Prepared</th>
                  <th className="py-3 px-4 text-right">Consumed</th>
                  <th className="py-3 px-4 text-right">Waste Rate %</th>
                  <th className="py-3 px-4 text-right">Waste / Guest</th>
                  <th className="py-3 px-4 text-right">Waste Cost</th>
                  <th className="py-3 px-4 text-center">Data Health</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEvents.map((ev) => {
                  const isArchived = ev.is_archived;
                  return (
                    <tr
                      key={ev.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isArchived ? "bg-slate-50/60 opacity-60" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(ev)}
                            title="Click to view full event insights, charts, and dish breakdown"
                            className="font-bold text-slate-900 hover:text-emerald-700 hover:underline text-left cursor-pointer transition-colors"
                          >
                            {ev.name}
                          </button>
                          {isArchived && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                              Archived
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-slate-700">{ev.event_type}</span>
                          {ev.event_subtype && <span>• {ev.event_subtype}</span>}
                          {ev.client_name && <span>• Client: {ev.client_name}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{ev.hotel_name || "Hotel"}</div>
                        <div className="text-[11px] text-slate-500">{ev.venue || "Banquet Hall"}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono">
                        {ev.event_date}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {ev.actual_guests || ev.expected_guests}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {formatKg(ev.total_prepared_kg)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        {formatKg(ev.total_consumed_kg)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            ev.waste_percentage <= 5 ? "text-emerald-700" : "text-rose-700"
                          }
                        >
                          {ev.waste_percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {ev.waste_per_guest_grams.toFixed(0)}g
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(ev.total_waste_cost)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.data_completeness_pct >= 90
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {ev.data_completeness_pct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(ev)}
                            title="Inspect Event Analytics & Graphs"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isArchived ? (
                            <button
                              onClick={() => handleRestoreEvent(ev.id)}
                              title="Restore archived event"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenDelete(ev)}
                              title="Safely delete / archive event"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Events Table Pagination Controls */}
        {filteredEvents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <span>
                Showing <strong>{(eventsPage - 1) * eventsPerPage + 1}</strong> to{" "}
                <strong>{Math.min(eventsPage * eventsPerPage, filteredEvents.length)}</strong> of{" "}
                <strong>{filteredEvents.length}</strong> events
              </span>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Per page:</span>
                <select
                  value={eventsPerPage}
                  onChange={(e) => {
                    setEventsPerPage(Number(e.target.value));
                    setEventsPage(1);
                  }}
                  className="px-2 py-0.5 border border-slate-200 rounded-md bg-white text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden"
                >
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={eventsPage <= 1}
                onClick={() => setEventsPage((prev) => Math.max(1, prev - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {Array.from({ length: totalEventsPages }, (_, i) => i + 1).map((pg) => {
                if (
                  pg === 1 ||
                  pg === totalEventsPages ||
                  (pg >= eventsPage - 1 && pg <= eventsPage + 1)
                ) {
                  return (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setEventsPage(pg)}
                      className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-colors ${
                        eventsPage === pg
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {pg}
                    </button>
                  );
                } else if (
                  (pg === 2 && eventsPage > 3) ||
                  (pg === totalEventsPages - 1 && eventsPage < totalEventsPages - 2)
                ) {
                  return <span key={pg} className="px-1 text-slate-400">...</span>;
                }
                return null;
              })}

              <button
                type="button"
                disabled={eventsPage >= totalEventsPages}
                onClick={() => setEventsPage((prev) => Math.min(totalEventsPages, prev + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Event-Type Waste Intelligence & Dish Comparison Workspace (Positioned below Events Management) */}
      <EventTypeIntelligenceWorkspace
        initialHotel={selectedHotel}
        initialDatePreset={datePreset}
        isEmbeddedInEventsPage={true}
      />

      {/* Cross-Event Audience Appetite Comparison Section (when data is present) */}
      {crossEventData && (
        <CrossEventComparisonSection comparisonData={crossEventData} />
      )}

      {/* CREATE EVENT MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  {formStep === 1 ? "Create Operational Event" : "Add Meal Sessions & Dishes"}
                </h3>
                <p className="text-xs text-slate-500">
                  Step {formStep} of 2 • Enter banquet metadata and itemized culinary records with mass-balance checks.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEventSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {formStep === 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Hotel Property *</label>
                    <select
                      value={hotelId}
                      onChange={(e) => setHotelId(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                      required
                    >
                      <option value={1}>Hotel Sahara</option>
                      <option value={2}>Hotel Sitara</option>
                      <option value={3}>Dolphin Hotels</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Event Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Tech Annual Conference"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Event Date *</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Event Category *</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                      required
                    >
                      <option value="Corporate">Corporate</option>
                      <option value="Conference">Conference</option>
                      <option value="Social">Social</option>
                      <option value="Wedding">Wedding</option>
                      <option value="Custom">Custom Category</option>
                    </select>
                  </div>

                  {eventType === "Custom" && (
                    <div className="space-y-1 sm:col-span-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                      <label className="font-semibold text-indigo-950 text-xs">Custom Category Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Sports Gala, Charity Auction, Press Briefing"
                        value={customEventTypeName}
                        onChange={(e) => setCustomEventTypeName(e.target.value)}
                        className="w-full p-2 text-xs border border-indigo-200 bg-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                        required
                      />
                      <p className="text-[10px] text-indigo-600">This custom category will be stored canonically under Custom for standardized auditing.</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Subtype / Format</label>
                    <input
                      type="text"
                      placeholder="e.g. Product Launch, Gala Dinner"
                      value={eventSubtype}
                      onChange={(e) => setEventSubtype(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Organizer / Client</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Technologies Inc."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Service Format</label>
                    <select
                      value={serviceFormat}
                      onChange={(e) => setServiceFormat(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="Buffet">Buffet</option>
                      <option value="Banquet Set Menu">Banquet Set Menu</option>
                      <option value="À la Carte">À la Carte</option>
                      <option value="Cocktail & Finger Food">Cocktail & Finger Food</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Venue / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Peacock Banquet Hall"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Expected Guests (Pax) *</label>
                    <input
                      type="number"
                      min={1}
                      value={expectedPax}
                      onChange={(e) => setExpectedPax(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Actual Guests Served *</label>
                    <input
                      type="number"
                      min={0}
                      value={actualPax}
                      onChange={(e) => setActualPax(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                </div>
              ) : (
                /* Step 2: Dishes & Food Flow */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">
                        Dish Production & Waste Mass-Balance
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Verify that: Leftover = Reused + Discarded Waste for every item.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDishRow}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Dish Row
                    </button>
                  </div>

                  <div className="space-y-3">
                    {dishes.map((d, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            placeholder="Dish Name *"
                            value={d.dish_name}
                            onChange={(e) => handleDishChange(idx, "dish_name", e.target.value)}
                            className="p-2 border border-slate-200 rounded-lg bg-white"
                            required
                          />
                          <select
                            value={d.session}
                            onChange={(e) => handleDishChange(idx, "session", e.target.value)}
                            className="p-2 border border-slate-200 rounded-lg bg-white"
                          >
                            <option value="Breakfast">Breakfast</option>
                            <option value="Lunch">Lunch</option>
                            <option value="Hi-Tea">Hi-Tea</option>
                            <option value="Dinner">Dinner</option>
                          </select>
                          <select
                            value={d.category}
                            onChange={(e) => handleDishChange(idx, "category", e.target.value)}
                            className="p-2 border border-slate-200 rounded-lg bg-white"
                          >
                            <option value="Starters">Starters</option>
                            <option value="Main Course">Main Course</option>
                            <option value="Rice">Rice</option>
                            <option value="Desserts">Desserts</option>
                            <option value="Beverages">Beverages</option>
                          </select>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="₹ Cost/kg"
                              value={d.item_cost}
                              onChange={(e) => handleDishChange(idx, "item_cost", e.target.value)}
                              className="p-2 border border-slate-200 rounded-lg bg-white w-full"
                            />
                            {dishes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDishRow(idx)}
                                className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quantities Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-200/60">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Cooked (kg)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.prepared_kg}
                              onChange={(e) => handleDishChange(idx, "prepared_kg", e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Eaten (kg)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.consumed_kg}
                              onChange={(e) => handleDishChange(idx, "consumed_kg", e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Leftover (kg)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.leftover_kg}
                              onChange={(e) => handleDishChange(idx, "leftover_kg", e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-700 block">Reused (kg)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.reuse_kg}
                              onChange={(e) => handleDishChange(idx, "reuse_kg", e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded-lg bg-white text-emerald-800 font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-rose-700 block">Waste (kg)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.waste_kg}
                              onChange={(e) => handleDishChange(idx, "waste_kg", e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded-lg bg-white text-rose-800 font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {formStep === 2 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Back to Event Info
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 text-slate-500 text-xs font-semibold hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>

                  {formStep === 1 ? (
                    <button
                      type="button"
                      disabled={!eventName.trim()}
                      onClick={() => setFormStep(2)}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                    >
                      Next: Add Dishes & Quantities
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={savingEvent}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {savingEvent && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      Save & Commit Event
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFE DELETE CONFIRMATION MODAL */}
      {deleteModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-slate-900">
                  Archive Event: {deleteModalEvent.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {deleteModalEvent.event_date} • {deleteModalEvent.hotel_name || "Hotel"}
                </p>
              </div>
            </div>

            {loadingDeleteImpact ? (
              <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
                Auditing dependent food items and scan linkages...
              </div>
            ) : deleteImpact ? (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Associated Dish Items:</span>
                    <strong className="text-slate-900">{deleteImpact.food_items_count}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Camera AI Scans:</span>
                    <strong className="text-slate-900">{deleteImpact.waste_scans_count}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Active Analytics Ledger Records:</span>
                    <strong className="text-slate-900">{deleteImpact.analytics_records_count}</strong>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {deleteImpact.message}
                </p>
              </div>
            ) : null}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalEvent(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Safe Archival
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVENT DEEP-DIVE & VISUAL INSIGHTS MODAL */}
      {selectedDetailEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedDetailEvent.event_type}
                  </span>
                  {selectedDetailEvent.event_subtype && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {selectedDetailEvent.event_subtype}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                    {selectedDetailEvent.service_format || "Buffet"}
                  </span>
                  {selectedDetailEvent.is_archived && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                      Archived
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                  {selectedDetailEvent.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                  <span>Hotel: <strong className="text-slate-800 font-semibold">{selectedDetailEvent.hotel_name || "Hotel"}</strong></span>
                  <span>• Date: <strong className="text-slate-800 font-semibold">{selectedDetailEvent.event_date}</strong></span>
                  <span>• Attendance: <strong className="text-slate-900 font-bold">{selectedDetailEvent.actual_guests || selectedDetailEvent.expected_guests} covers</strong> ({selectedDetailEvent.expected_guests} expected)</span>
                  {selectedDetailEvent.venue && <span>• Venue: <strong className="text-slate-800 font-semibold">{selectedDetailEvent.venue}</strong></span>}
                </p>
                {distinctSessions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recorded Sessions:</span>
                    {distinctSessions.map((sess) => (
                      <span key={sess} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {sess}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Print event summary"
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDetailEvent(null);
                    setDetailFullData(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {detailError && (
              <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{detailError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDetail(selectedDetailEvent)}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                >
                  Retry Loading
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* 4 Core Hero Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Food Prepared</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {formatKg(effectivePrepKg)}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">100% kitchen batch</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Food Consumed</span>
                  <div className="text-xl font-bold font-mono text-emerald-800 mt-1">
                    {formatKg(effectiveConsumedKg)}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
                    {effectivePrepKg > 0
                      ? `${((effectiveConsumedKg / effectivePrepKg) * 100).toFixed(1)}% eaten by guests`
                      : "Direct consumption"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">Safely Reused</span>
                  <div className="text-xl font-bold font-mono text-teal-800 mt-1">
                    {formatKg(effectiveReuseKg)}
                  </div>
                  <span className="text-[11px] text-teal-700 font-medium mt-0.5 block">
                    {effectiveLeftoverKg > 0
                      ? `${((effectiveReuseKg / effectiveLeftoverKg) * 100).toFixed(1)}% leftovers diverted`
                      : "0.0% diverted"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Final Waste & Loss</span>
                  <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                    {formatKg(effectiveWasteKg)}
                  </div>
                  <span className="text-[11px] text-rose-700 font-semibold mt-0.5 block">
                    {formatINR(effectiveWasteCost)} loss ({effectiveWastePct.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Dynamic Visual Food-Flow Balance Bars */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    Operational Food Flow & Mass Balance
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    Waste / Guest: <strong className="text-slate-900">{effectiveWastePerGuest.toFixed(0)}g</strong> • Eaten / Guest: <strong className="text-emerald-700">{effectiveIntakePerGuest.toFixed(0)}g</strong>
                  </span>
                </div>

                {/* Production Stage Flow Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Stage 1: Production Utilization</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Consumed: {formatKg(effectiveConsumedKg)} • Leftover: {formatKg(effectiveLeftoverKg)}
                    </span>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          effectivePrepKg > 0
                            ? (effectiveConsumedKg / effectivePrepKg) * 100
                            : 0
                        )}%`,
                      }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                      title="Consumed Food"
                    />
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          effectivePrepKg > 0
                            ? (effectiveLeftoverKg / effectivePrepKg) * 100
                            : 0
                        )}%`,
                      }}
                      className="bg-amber-400 h-full transition-all duration-500"
                      title="Leftover Food"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Consumed: {effectivePrepKg > 0 ? ((effectiveConsumedKg / effectivePrepKg) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                      Leftovers: {effectivePrepKg > 0 ? ((effectiveLeftoverKg / effectivePrepKg) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>

                {/* Disposition Stage Flow Bar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Stage 2: Leftover Disposition</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Reused: {formatKg(effectiveReuseKg)} • Discarded Waste: {formatKg(effectiveWasteKg)}
                    </span>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          effectiveLeftoverKg > 0
                            ? (effectiveReuseKg / effectiveLeftoverKg) * 100
                            : 0
                        )}%`,
                      }}
                      className="bg-teal-500 h-full transition-all duration-500"
                      title="Safely Reused"
                    />
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          effectiveLeftoverKg > 0
                            ? (effectiveWasteKg / effectiveLeftoverKg) * 100
                            : 0
                        )}%`,
                      }}
                      className="bg-rose-500 h-full transition-all duration-500"
                      title="Final Discarded Waste"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                      Reused (Diverted): {effectiveLeftoverKg > 0 ? ((effectiveReuseKg / effectiveLeftoverKg) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      Final Waste: {effectiveLeftoverKg > 0 ? ((effectiveWasteKg / effectiveLeftoverKg) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION: EXECUTIVE ANALYTICS & ENTERPRISE INTELLIGENCE */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 border border-indigo-100/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                      Executive Culinary Analytics & Operational Intelligence
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Hospitality Industry Benchmark
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Card 1: Production Yield Score */}
                  <div className="p-3.5 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Yield Efficiency</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${effectiveYieldPct >= 92 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {effectiveYieldPct >= 92 ? "Optimal" : "Over-batched"}
                      </span>
                    </div>
                    <div className="text-lg font-bold font-mono text-slate-900">
                      {effectiveYieldPct.toFixed(1)}%
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      Guest consumption captured {formatKg(effectiveConsumedKg)} of total {formatKg(effectivePrepKg)} batch.
                    </p>
                  </div>

                  {/* Card 2: Margin Recovery Target */}
                  <div className="p-3.5 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Margin Recovery</span>
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-lg font-bold font-mono text-emerald-700">
                      {formatINR(potentialSavings)}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      Achievable savings by trimming secondary replenishment pans by 18%.
                    </p>
                  </div>

                  {/* Card 3: Carbon & ESG Footprint */}
                  <div className="p-3.5 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500">ESG & Sustainability</span>
                      <Leaf className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="text-lg font-bold font-mono text-teal-800">
                      {carbonFootprintKg} kg CO₂e
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      {waterFootprintLiters.toLocaleString()} L water • {mealEquivalentsLost} meals lost ({diversionRatePct.toFixed(0)}% diverted).
                    </p>
                  </div>

                  {/* Card 4: Guest Velocity */}
                  <div className="p-3.5 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Per-Guest Ratio</span>
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="text-lg font-bold font-mono text-indigo-900">
                      {effectiveIntakePerGuest.toFixed(0)}g / {effectiveWastePerGuest.toFixed(0)}g
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      Observed intake vs discarded waste per verified guest cover.
                    </p>
                  </div>
                </div>

                {/* HACCP Food Safety & Waste Breakdown Banner */}
                <div className="p-3.5 bg-white rounded-xl border border-indigo-100/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Buffet Runoff (Avoidable)
                    </span>
                    <span className="font-bold text-amber-800 text-sm">~82% of Discards</span>
                    <p className="text-[10px] text-slate-500">Overproduction left on chafing counters at end of meal windows.</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Plate Waste (Unavoidable)
                    </span>
                    <span className="font-bold text-slate-700 text-sm">~18% of Discards</span>
                    <p className="text-[10px] text-slate-500">In-kitchen prep trimmings and post-consumer plate scraping.</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      HACCP Diversion Status
                    </span>
                    <span className="font-bold text-teal-700 text-sm">100% Cold-Chain Verified</span>
                    <p className="text-[10px] text-slate-500">{formatKg(effectiveReuseKg)} redirected to cafeteria under thermal logging.</p>
                  </div>
                </div>

                {/* Actionable Chef Guidance */}
                <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-3 text-xs">
                  <ChefHat className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-indigo-950 block">
                      Executive Chef & Banquet Service Protocol
                    </span>
                    <p className="text-indigo-900 leading-relaxed text-[11px]">
                      {effectiveWastePct > 8
                        ? `Elevated buffet runoff identified (${effectiveWastePct.toFixed(1)}%). Implement split-batch chafing pans for late-arrival windows and transfer unused pre-plated items directly to blast chillers 30 minutes before service conclusion.`
                        : `Excellent portion alignment (${effectiveWastePct.toFixed(1)}% waste rate). Maintain the current preparation staging protocol. Keep secondary pans in kitchen warming cabinets rather than displaying full depths on active buffet counters.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: DEDICATED FOOD ANALYSIS & CATEGORY INTELLIGENCE */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                      Food Analysis & Service Breakdown
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Multi-session dynamics, dietary distribution, culinary station yields, and zero-waste champions.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Total Menu Ledger: <strong className="text-slate-900">{effectiveDishesCount} dishes</strong>
                  </span>
                </div>

                {/* Multi-Session Performance Breakdown (Interactive Cards) */}
                {sessionAnalytics.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                        Service Session Analysis (Click to Filter Table)
                      </span>
                      {dishSessionFilter !== "all" && (
                        <button
                          type="button"
                          onClick={() => setDishSessionFilter("all")}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                        >
                          Reset Session Filter ({dishSessionFilter})
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {sessionAnalytics.map((s) => {
                        const sWastePct = s.prepared_kg > 0 ? (s.waste_kg / s.prepared_kg) * 100 : 0;
                        const isSelected = dishSessionFilter === s.session;
                        return (
                          <div
                            key={s.session}
                            onClick={() => setDishSessionFilter(isSelected ? "all" : s.session)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200 shadow-xs"
                                : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                {s.session}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sWastePct <= 4
                                    ? "bg-emerald-100 text-emerald-800"
                                    : sWastePct <= 8
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {sWastePct.toFixed(1)}% waste
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 block font-sans">Prep</span>
                                <span className="font-semibold text-slate-800">{formatKg(s.prepared_kg)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 block font-sans">Waste</span>
                                <span className="font-semibold text-rose-700">{formatKg(s.waste_kg)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 block font-sans">Loss</span>
                                <span className="font-semibold text-slate-900">{formatINR(s.waste_cost)}</span>
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                              <span>{s.count} dishes</span>
                              <span className={isSelected ? "text-emerald-700 font-bold" : "text-slate-400"}>
                                {isSelected ? "Filtered view" : "Click to view"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dietary Profile Split (Veg vs Non-Veg) */}
                {foodTypeAnalytics && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                      Dietary Distribution & Financial Impact
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Veg */}
                      <div className="p-3 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded border border-emerald-600 flex items-center justify-center p-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block">Vegetarian Items</span>
                            <span className="text-[10px] text-slate-500">
                              {foodTypeAnalytics.veg.count} dishes • {formatKg(foodTypeAnalytics.veg.prep_kg)} prep
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-slate-900 block">{formatINR(foodTypeAnalytics.veg.cost)} loss</span>
                          <span className="text-[10px] text-slate-500">
                            {formatKg(foodTypeAnalytics.veg.waste_kg)} ({foodTypeAnalytics.veg.waste_pct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Non-Veg */}
                      <div className="p-3 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded border border-rose-600 flex items-center justify-center p-0.5">
                            <span className="w-2 h-2 rounded-full bg-rose-600" />
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block">Non-Vegetarian Items</span>
                            <span className="text-[10px] text-slate-500">
                              {foodTypeAnalytics.nonVeg.count} dishes • {formatKg(foodTypeAnalytics.nonVeg.prep_kg)} prep
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-rose-700 block">{formatINR(foodTypeAnalytics.nonVeg.cost)} loss</span>
                          <span className="text-[10px] text-slate-500">
                            {formatKg(foodTypeAnalytics.nonVeg.waste_kg)} ({foodTypeAnalytics.nonVeg.waste_pct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Cards Grid */}
                {categoryAnalytics.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                      Station Breakdown & Waste Intensity {dishSessionFilter !== "all" && `(${dishSessionFilter})`}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryAnalytics.map((cat) => {
                        const catWastePct = cat.prepared_kg > 0 ? (cat.waste_kg / cat.prepared_kg) * 100 : 0;
                        const catEatenPct = cat.prepared_kg > 0 ? (cat.consumed_kg / cat.prepared_kg) * 100 : 100;
                        return (
                          <div key={cat.category} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-xs">{cat.category}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${catWastePct <= 5 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                {catWastePct.toFixed(1)}% waste
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono pt-1">
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 block font-sans">Cooked</span>
                                <span className="font-semibold text-slate-800">{formatKg(cat.prepared_kg)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 block font-sans">Wasted</span>
                                <span className="font-semibold text-rose-700">{formatKg(cat.waste_kg)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 block font-sans">Cost Loss</span>
                                <span className="font-semibold text-slate-900">{formatINR(cat.waste_cost)}</span>
                              </div>
                            </div>

                            {/* Velocity bar */}
                            <div className="space-y-1 pt-1">
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                                <div style={{ width: `${Math.min(100, catEatenPct)}%` }} className="bg-emerald-500 h-full" />
                                <div style={{ width: `${Math.min(100, catWastePct)}%` }} className="bg-rose-500 h-full" />
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>{cat.count} items recorded</span>
                                <span>{catEatenPct.toFixed(0)}% eaten</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Highlights: Top Waste Culprits & Zero-Waste Champions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Top Waste Culprits */}
                  <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-100 space-y-2">
                    <div className="flex items-center gap-1.5 text-rose-900">
                      <Flame className="w-4 h-4 text-rose-600" />
                      <span className="text-xs font-bold uppercase tracking-wider">Top Cost Loss Culprits</span>
                    </div>
                    {topWastedDishes.length > 0 ? (
                      <div className="space-y-2">
                        {topWastedDishes.map((d: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-rose-100 text-xs">
                            <div>
                              <span className="font-bold text-slate-900 block">{d.food_item_name}</span>
                              <span className="text-[10px] text-slate-500">{d.food_item_category} • {d.session || "Main"} • {formatKg(d.prepared_weight_kg)} prep</span>
                            </div>
                            <div className="text-right font-mono">
                              <span className="font-bold text-rose-700 block">{formatINR(d.waste_cost)}</span>
                              <span className="text-[10px] text-rose-600">{formatKg(d.net_waste_kg)} ({d.waste_percentage?.toFixed(1) || 0}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No major waste drivers detected.</p>
                    )}
                  </div>

                  {/* Zero-Waste Champions */}
                  <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-900">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold uppercase tracking-wider">Zero-Waste Star Dishes</span>
                    </div>
                    {zeroWasteDishes.length > 0 ? (
                      <div className="space-y-2">
                        {zeroWasteDishes.map((d: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-100 text-xs">
                            <div>
                              <span className="font-bold text-slate-900 block">{d.food_item_name}</span>
                              <span className="text-[10px] text-slate-500">{d.food_item_category} • {d.session || "Main"} • 100% guest appetite</span>
                            </div>
                            <div className="text-right font-mono">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                0% Waste
                              </span>
                              <span className="text-[10px] text-slate-500 block mt-0.5">{formatKg(d.prepared_weight_kg)} eaten</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Every dish had some leftover logged.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: ITEMIZED DISH RECORDS & COST IMPACT (FILTERABLE & SORTABLE) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Itemized Dish Records & Cost Ledger
                    </h4>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700">
                      {filteredDishes.length} of {effectiveDishesCount} dishes
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {loadingDetailFull && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mr-2">
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                        Loading dish ledger...
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={exportDishLedgerCSV}
                      disabled={filteredDishes.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-all disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search dish name (e.g. Biryani, Idly, Paneer)..."
                        value={dishSearchTerm}
                        onChange={(e) => setDishSearchTerm(e.target.value)}
                        className="bg-transparent text-xs w-full focus:outline-hidden text-slate-800 font-medium"
                      />
                      {dishSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setDishSearchTerm("")}
                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Dietary Type Filter */}
                      <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setDishFoodTypeFilter("all")}
                          className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                            dishFoodTypeFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setDishFoodTypeFilter("Veg")}
                          className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                            dishFoodTypeFilter === "Veg" ? "bg-emerald-700 text-white" : "text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          Veg
                        </button>
                        <button
                          type="button"
                          onClick={() => setDishFoodTypeFilter("Non-Veg")}
                          className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                            dishFoodTypeFilter === "Non-Veg" ? "bg-rose-700 text-white" : "text-rose-700 hover:bg-rose-50"
                          }`}
                        >
                          Non-Veg
                        </button>
                      </div>

                      {/* Sort Dropdown */}
                      <select
                        value={dishSortBy}
                        onChange={(e: any) => setDishSortBy(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer"
                      >
                        <option value="waste_desc">Sort: Highest Waste (kg)</option>
                        <option value="cost_desc">Sort: Highest Cost Loss (₹)</option>
                        <option value="prep_desc">Sort: Highest Prepared (kg)</option>
                        <option value="pct_desc">Sort: Highest Waste %</option>
                      </select>
                    </div>
                  </div>

                  {/* Secondary Pills Row: Session & Category */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                    {distinctSessions.length > 1 && (
                      <div className="flex items-center gap-1 flex-wrap mr-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Session:</span>
                        <button
                          type="button"
                          onClick={() => setDishSessionFilter("all")}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                            dishSessionFilter === "all"
                              ? "bg-emerald-700 text-white"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          All Sessions
                        </button>
                        {distinctSessions.map((sess) => (
                          <button
                            key={sess}
                            type="button"
                            onClick={() => setDishSessionFilter(sess)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                              dishSessionFilter === sess
                                ? "bg-emerald-700 text-white"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {sess}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category:</span>
                      <button
                        type="button"
                        onClick={() => setDishCategoryFilter("all")}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                          dishCategoryFilter === "all"
                            ? "bg-slate-900 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        All
                      </button>
                      {distinctCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setDishCategoryFilter(cat)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                            dishCategoryFilter === cat
                              ? "bg-slate-900 text-white"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider sticky top-0 z-10 shadow-2xs">
                      <tr>
                        <th className="py-2.5 px-3.5">Dish Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Session</th>
                        <th className="py-2.5 px-3 text-right">Prepared</th>
                        <th className="py-2.5 px-3 text-right">Consumed</th>
                        <th className="py-2.5 px-3 text-right">Leftover</th>
                        <th className="py-2.5 px-3 text-right">Reused</th>
                        <th className="py-2.5 px-3 text-right">Waste</th>
                        <th className="py-2.5 px-3 text-right">Waste %</th>
                        <th className="py-2.5 px-3 text-right">Cost Loss</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {filteredDishes.length > 0 ? (
                        filteredDishes.map((food: any) => {
                          const prep = Number(food.prepared_weight_kg) || 0;
                          const waste = Number(food.net_waste_kg) || 0;
                          const cons = Number(food.consumed_weight_kg) || Math.max(0, prep - waste);
                          const leftover = Number(food.leftover_weight_kg) || waste;
                          const reuse = Number(food.reused_weight_kg) || 0;
                          const wastePct = food.waste_percentage || (prep > 0 ? (waste / prep) * 100 : 0);
                          const isVeg = (food.food_type || "Veg") === "Veg";

                          return (
                            <tr key={food.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-900 flex items-center gap-2">
                                <span
                                  className={`w-3 h-3 rounded-xs border flex items-center justify-center shrink-0 ${
                                    isVeg ? "border-emerald-600" : "border-rose-600"
                                  }`}
                                  title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isVeg ? "bg-emerald-600" : "bg-rose-600"
                                    }`}
                                  />
                                </span>
                                <span>{food.food_item_name}</span>
                              </td>
                              <td className="py-2.5 px-3 font-sans text-slate-600">
                                {food.food_item_category}
                              </td>
                              <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px]">
                                {food.session || "Main"}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-800">
                                {formatKg(prep)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                                {formatKg(cons)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-600">
                                {formatKg(leftover)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-teal-700 font-medium">
                                {formatKg(reuse)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-rose-700 font-bold">
                                {formatKg(waste)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    wastePct <= 4
                                      ? "bg-emerald-100 text-emerald-800"
                                      : wastePct <= 10
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {wastePct.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {formatINR(food.waste_cost)}
                              </td>
                              <td className="py-2.5 px-3 font-sans text-[11px] text-slate-500 max-w-[180px] truncate" title={food.notes || ""}>
                                {food.notes || "Recorded"}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-400 font-sans">
                            {loadingDetailFull
                              ? "Retrieving individual dish quantities from database..."
                              : dishSearchTerm || dishCategoryFilter !== "all" || dishSessionFilter !== "all" || dishFoodTypeFilter !== "all"
                              ? "No dishes matching your current filter criteria."
                              : "No itemized dishes recorded for this event."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {filteredDishes.length > 0 && (
                      <tfoot className="bg-slate-100/90 font-mono font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10 text-xs">
                        <tr>
                          <td className="py-2.5 px-3.5 font-sans" colSpan={3}>
                            Filtered Total ({filteredDishesSummary.count} dishes)
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatKg(filteredDishesSummary.prep_kg)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-800">
                            {formatKg(filteredDishesSummary.consumed_kg)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {formatKg(filteredDishesSummary.leftover_kg)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-teal-800">
                            {formatKg(filteredDishesSummary.reused_kg)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-800 font-black">
                            {formatKg(filteredDishesSummary.waste_kg)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-900">
                              {filteredDishesSummary.waste_pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-800 font-black">
                            {formatINR(filteredDishesSummary.cost_loss)}
                          </td>
                          <td className="py-2.5 px-3 text-[10px] text-slate-500 font-normal">
                            Live Ledger Totals
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Part 5: Menu Planning & Preparation Recommendation Engine ("What Should We Prepare Next Time?") */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 border border-emerald-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                        Menu Planning & Kitchen Preparation Planner
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                        Evidence-Based Formula
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Forecast batch preparation quantities for upcoming comparable banquet services using historical guest consumption velocity and safety buffers.
                    </p>
                  </div>

                  {/* Interactive Target Guests & Buffer Controls */}
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex-wrap">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Target Guests
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        value={plannerPax}
                        onChange={(e) => setPlannerPax(Math.max(1, Number(e.target.value) || 1))}
                        className="w-24 px-2 py-1 text-xs font-bold border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Safety Buffer
                      </label>
                      <select
                        value={plannerBuffer}
                        onChange={(e) => setPlannerBuffer(Number(e.target.value))}
                        className="px-2 py-1 text-xs font-bold border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 bg-white"
                      >
                        <option value={5}>5% (Tight / Low Waste)</option>
                        <option value={10}>10% (Standard Banquet)</option>
                        <option value={15}>15% (Conservative Buffer)</option>
                        <option value={20}>20% (High Margin / VIP)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quick Pax Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">Quick Pax:</span>
                  {[100, 250, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPlannerPax(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                        plannerPax === preset
                          ? "bg-emerald-700 text-white border-emerald-700"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {preset} covers
                    </button>
                  ))}
                  {effectivePax > 0 && (
                    <button
                      type="button"
                      onClick={() => setPlannerPax(effectivePax)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                        plannerPax === effectivePax
                          ? "bg-emerald-700 text-white border-emerald-700"
                          : "bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                      }`}
                    >
                      Reset to Event ({effectivePax} covers)
                    </button>
                  )}
                </div>

                {/* Calculation Methodology Banner */}
                <div className="px-3.5 py-2 rounded-xl bg-emerald-100/50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between">
                  <span>
                    <strong>Formula:</strong> (Observed Intake per Guest in grams ÷ 1000) × <strong>{plannerPax} Guests</strong> × <strong>(1 + {plannerBuffer}%)</strong>
                  </span>
                  <span className="text-[10px] text-emerald-800 italic">
                    Historical Event Attendance: {effectivePax} guests
                  </span>
                </div>

                {/* Recommendations Table */}
                <div className="overflow-x-auto rounded-xl border border-emerald-200/80 bg-white max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-emerald-50/60 border-b border-emerald-100 text-[10px] font-bold uppercase text-emerald-900 tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Dish Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Intake / Guest</th>
                        <th className="py-2.5 px-3 text-right">Prior Waste %</th>
                        <th className="py-2.5 px-3 text-center">Batch Status</th>
                        <th className="py-2.5 px-3 text-right font-black text-emerald-950">Suggested Prep ({plannerPax} pax)</th>
                        <th className="py-2.5 px-3">Culinary Guidance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {detailFullData?.event_foods && detailFullData.event_foods.length > 0 ? (
                        detailFullData.event_foods.map((food: any) => {
                          const actualPax = effectivePax;
                          const prepKg = Number(food.prepared_weight_kg) || 0;
                          const wasteKg = Number(food.net_waste_kg) || 0;
                          const consumedKg = Number(food.consumed_weight_kg) || Math.max(0, prepKg - wasteKg);
                          const intakePerGuestG = actualPax > 0 ? (consumedKg / actualPax) * 1000 : 150;
                          const baseNeedKg = (intakePerGuestG / 1000) * plannerPax;
                          const suggestedKg = Number((baseNeedKg * (1 + plannerBuffer / 100)).toFixed(1));
                          const wastePct = food.waste_percentage || (prepKg > 0 ? (wasteKg / prepKg) * 100 : 0);

                          const isOverprod = wastePct >= 18;
                          const isHighVelocity = wastePct <= 3 && prepKg > 0;

                          return (
                            <tr key={food.id} className="hover:bg-emerald-50/30">
                              <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                                {food.food_item_name}
                              </td>
                              <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px]">
                                {food.food_item_category}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-800">
                                {intakePerGuestG.toFixed(0)} g
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className={wastePct > 15 ? "text-rose-700 font-bold" : "text-emerald-700 font-medium"}>
                                  {wastePct.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isOverprod ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    Overproduction Risk
                                  </span>
                                ) : isHighVelocity ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                    High Velocity
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Optimal Alignment
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-950 font-black text-sm">
                                {suggestedKg} kg
                              </td>
                              <td className="py-2.5 px-3 font-sans text-[11px] text-slate-600 max-w-xs">
                                {isOverprod ? (
                                  <span className="text-amber-900">
                                    Prior event had {formatKg(wasteKg)} unconsumed. Reduce batch to <strong>{suggestedKg} kg</strong> to save cost without risking shortage.
                                  </span>
                                ) : isHighVelocity ? (
                                  <span className="text-blue-900">
                                    Rapid depletion observed. Prepare <strong>{suggestedKg} kg</strong> initial batch with a 5 kg reserve pan in warming.
                                  </span>
                                ) : (
                                  <span className="text-slate-600">
                                    Production met guest intake reliably. Maintain <strong>{suggestedKg} kg</strong> standard batch.
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 font-sans">
                            {loadingDetailFull ? "Calculating menu planning recommendations..." : "No dish records available to forecast preparation."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  Note: These recommendations are data-driven operational benchmarks to assist executive chefs with banquet forecast sheets. They reflect observed consumption velocity and do not overwrite standard recipes or mandatory minimum batch yields.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
              <a
                href={`/events/${selectedDetailEvent.id}/analytics`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Open Camera AI Scans & Verification Report
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDetailEvent(null);
                    setDetailFullData(null);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
