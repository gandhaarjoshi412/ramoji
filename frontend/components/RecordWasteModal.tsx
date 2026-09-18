"use client";

import React, { useState, useEffect } from "react";
import { Scale, AlertCircle, Check, X } from "lucide-react";
import { EventFood, WasteRecord } from "@/types";
import { apiRequest } from "@/lib/api";

interface RecordWasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  foods: EventFood[];
  initialFoodId?: number;
  onSuccess: () => void;
}

const WASTE_REASONS = [
  "Excess preparation",
  "Low consumption",
  "Overproduction",
  "Service leftover",
  "Plate/serving leftover",
  "Other",
];

export const RecordWasteModal: React.FC<RecordWasteModalProps> = ({
  isOpen,
  onClose,
  eventId,
  foods,
  initialFoodId,
  onSuccess,
}) => {
  const [selectedFoodId, setSelectedFoodId] = useState<number | "">("");
  const [grossInput, setGrossInput] = useState<string>("");
  const [containerInput, setContainerInput] = useState<string>("0");
  const [wasteReason, setWasteReason] = useState<string>("Excess preparation");
  const [notes, setNotes] = useState<string>("");
  const [weightSource, setWeightSource] = useState<string>("Manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialFoodId) {
      setSelectedFoodId(initialFoodId);
    } else if (foods.length > 0 && selectedFoodId === "") {
      setSelectedFoodId(foods[0].id);
    }
  }, [initialFoodId, foods, isOpen]);

  if (!isOpen) return null;

  const gross = parseFloat(grossInput) || 0;
  const container = parseFloat(containerInput) || 0;
  const netLeftover = gross > 0 ? Math.max(0, Math.round((gross - container) * 1000) / 1000) : 0;
  const isTareInvalid = container > gross && gross > 0;

  const currentFood = foods.find((f) => f.id === Number(selectedFoodId));
  const estimatedWasteCost = currentFood
    ? Math.round(netLeftover * currentFood.estimated_cost_per_kg)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFoodId) {
      setError("Please select a food item.");
      return;
    }

    if (gross <= 0) {
      setError("Gross weight must be greater than 0 kg.");
      return;
    }

    if (isTareInvalid) {
      setError("Container tare weight cannot exceed gross dish weight.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest(`/api/events/${eventId}/foods/${selectedFoodId}/waste`, {
        method: "POST",
        body: JSON.stringify({
          gross_weight_kg: gross,
          container_weight_kg: container,
          waste_reason: wasteReason,
          notes: notes.trim() || undefined,
          weight_source: weightSource,
        }),
      });

      setGrossInput("");
      setContainerInput("0");
      setNotes("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record dish waste.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="hotel-card bg-white max-w-md w-full p-6 sm:p-7 relative shadow-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
            <Scale className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-slate-900">Record Food Leftover</h2>
            <p className="text-xs text-slate-500 font-normal">
              Manual weigh-in and container tare calibration
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Select Menu Dish
            </label>
            <select
              value={selectedFoodId}
              onChange={(e) => setSelectedFoodId(Number(e.target.value))}
              required
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer shadow-2xs"
            >
              {foods.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.food_item_name} ({food.food_item_category}) — {food.prepared_weight_kg} kg prep
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Gross Weight (kg) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 12.5"
                value={grossInput}
                onChange={(e) => setGrossInput(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Container Tare (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 1.2"
                value={containerInput}
                onChange={(e) => setContainerInput(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs"
              />
            </div>
          </div>

          {/* Computed Net Preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Leftover Weight</span>
              <strong className="text-base text-rose-600 font-extrabold">{netLeftover} kg</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated Loss</span>
              <strong className="text-base text-slate-900 font-bold">₹{estimatedWasteCost}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Waste Reason
              </label>
              <select
                value={wasteReason}
                onChange={(e) => setWasteReason(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer shadow-2xs"
              >
                {WASTE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Scale Type
              </label>
              <select
                value={weightSource}
                onChange={(e) => setWeightSource(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer shadow-2xs"
              >
                <option value="Manual">Manual Entry</option>
                <option value="BluetoothScale">Bluetooth Scale</option>
                <option value="KitchenScale">Kitchen Bench Scale</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Audit Notes
            </label>
            <input
              type="text"
              placeholder="e.g. End of service clearing; 2 platters partially untouched."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="hotel-btn-secondary text-xs active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isTareInvalid}
              className="hotel-btn-emerald text-xs active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              {loading ? "Recording..." : "Log Waste Measurement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
