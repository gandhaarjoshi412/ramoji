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

  // Real-time dynamic calculation
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

    if (container < 0) {
      setError("Container weight cannot be negative.");
      return;
    }

    if (container > gross) {
      setError("Container weight cannot exceed gross weight.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest<WasteRecord>(`/api/events/${eventId}/waste`, {
        method: "POST",
        body: JSON.stringify({
          event_food_id: Number(selectedFoodId),
          gross_weight_kg: gross,
          container_weight_kg: container,
          waste_reason: wasteReason,
          notes: notes.trim() || undefined,
          weight_source: weightSource,
        }),
      });

      // Reset form
      setGrossInput("");
      setContainerInput("0");
      setNotes("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record waste.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Record Food Waste</h2>
            <p className="text-xs text-slate-500">
              Measure leftovers on kitchen scale and input readings
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Food Item Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              1. Select Prepared Food Item
            </label>
            <select
              value={selectedFoodId}
              onChange={(e) => setSelectedFoodId(Number(e.target.value))}
              required
              className="w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {foods.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.food_item_name} ({food.food_item_category}) — {food.prepared_weight_kg} kg prepared (₹{food.estimated_cost_per_kg}/kg)
                </option>
              ))}
            </select>
          </div>

          {/* Weight Source Provider Indicator */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <Scale className="w-4 h-4 text-emerald-600" />
              Weight Source:
            </span>
            <span className="font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
              ManualScaleProvider (Electronic Scale)
            </span>
          </div>

          {/* Weight Inputs (Side by side with large fonts) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Gross Weight (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  placeholder="e.g. 18.6"
                  value={grossInput}
                  onChange={(e) => setGrossInput(e.target.value)}
                  required
                  autoFocus
                  className="w-full text-xl font-bold h-12 px-3 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <span className="absolute right-3 top-3 text-slate-400 text-sm font-semibold">kg</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Food + container on scale</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Container / Tare (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  placeholder="e.g. 3.1"
                  value={containerInput}
                  onChange={(e) => setContainerInput(e.target.value)}
                  required
                  className={`w-full text-xl font-bold h-12 px-3 rounded-lg border text-slate-900 focus:ring-2 focus:ring-emerald-500 ${
                    isTareInvalid ? "border-red-400 bg-red-50" : "border-slate-300"
                  }`}
                />
                <span className="absolute right-3 top-3 text-slate-400 text-sm font-semibold">kg</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Empty vessel weight</p>
            </div>
          </div>

          {/* Real-time Net Leftover Display Banner */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isTareInvalid
                ? "bg-red-50 border-red-200 text-red-800"
                : netLeftover > 0
                ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  Calculated Net Leftover
                </div>
                <div className="text-2xl font-black tracking-tight">
                  {netLeftover.toFixed(2)} <span className="text-base font-bold">kg</span>
                </div>
              </div>
              {currentFood && netLeftover > 0 && (
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    Est. Waste Loss
                  </div>
                  <div className="text-xl font-black text-red-700">
                    ₹{estimatedWasteCost.toLocaleString("en-IN")}
                  </div>
                </div>
              )}
            </div>
            {isTareInvalid && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                Container weight cannot be higher than gross weight!
              </p>
            )}
          </div>

          {/* Waste Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Waste Reason
            </label>
            <select
              value={wasteReason}
              onChange={(e) => setWasteReason(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500"
            >
              {WASTE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Operational Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Leftover from live counter buffet"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit and Cancel Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isTareInvalid || gross <= 0}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Waste Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
