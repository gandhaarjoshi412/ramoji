"use client";

import React, { useState, useEffect } from "react";
import { Utensils, AlertCircle, Plus, X } from "lucide-react";
import { FoodItem } from "@/types";
import { apiRequest } from "@/lib/api";

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  onSuccess: () => void;
}

const CATEGORIES = [
  "Main Course",
  "Rice",
  "Bread",
  "Curry",
  "Dal",
  "Dessert",
  "Salad",
  "Beverage",
  "Other",
];

export const AddFoodModal: React.FC<AddFoodModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSuccess,
}) => {
  const [catalog, setCatalog] = useState<FoodItem[]>([]);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | "">("");
  const [customName, setCustomName] = useState<string>("");
  const [category, setCategory] = useState<string>("Main Course");
  const [preparedWeight, setPreparedWeight] = useState<string>("");
  const [costPerKg, setCostPerKg] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      apiRequest<FoodItem[]>("/api/foods")
        .then((items) => {
          setCatalog(items);
          if (items.length > 0 && !isCustom && selectedCatalogId === "") {
            setSelectedCatalogId(items[0].id);
            setCostPerKg(items[0].default_cost_per_kg.toString());
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCatalogChange = (id: number) => {
    setSelectedCatalogId(id);
    const item = catalog.find((i) => i.id === id);
    if (item) {
      setCostPerKg(item.default_cost_per_kg.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const prep = parseFloat(preparedWeight);
    if (!prep || prep <= 0) {
      setError("Prepared weight must be greater than 0 kg.");
      return;
    }

    const cost = parseFloat(costPerKg) || 0;
    if (cost < 0) {
      setError("Cost per kg cannot be negative.");
      return;
    }

    setLoading(true);
    try {
      if (isCustom) {
        if (!customName.trim()) {
          throw new Error("Food name is required.");
        }
        await apiRequest(`/api/events/${eventId}/foods`, {
          method: "POST",
          body: JSON.stringify({
            name: customName.trim(),
            category,
            prepared_weight_kg: prep,
            estimated_cost_per_kg: cost,
            notes: notes.trim() || undefined,
          }),
        });
      } else {
        await apiRequest(`/api/events/${eventId}/foods`, {
          method: "POST",
          body: JSON.stringify({
            food_item_id: Number(selectedCatalogId),
            prepared_weight_kg: prep,
            estimated_cost_per_kg: cost,
            notes: notes.trim() || undefined,
          }),
        });
      }

      setPreparedWeight("");
      setNotes("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add food item to event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add Menu Item</h2>
            <p className="text-xs text-slate-500">
              Specify food item prepared for this banquet
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsCustom(false)}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                !isCustom ? "bg-white shadow text-slate-900" : "text-slate-600"
              }`}
            >
              Select from Standard Menu
            </button>
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                isCustom ? "bg-white shadow text-slate-900" : "text-slate-600"
              }`}
            >
              + Custom Food Item
            </button>
          </div>

          {!isCustom ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Food Item
              </label>
              <select
                value={selectedCatalogId}
                onChange={(e) => handleCatalogChange(Number(e.target.value))}
                required
                className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium text-sm focus:ring-2 focus:ring-emerald-500"
              >
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category}) — Default ₹{item.default_cost_per_kg}/kg
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Food Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabadi Dum Biryani"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Prepared Quantity (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="e.g. 90"
                  value={preparedWeight}
                  onChange={(e) => setPreparedWeight(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 text-sm">kg</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Cost / kg (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="e.g. 180"
                  value={costPerKg}
                  onChange={(e) => setCostPerKg(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 text-sm">₹</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Cooked at central kitchen batch 1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold shadow-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {loading ? "Adding..." : "Add to Menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
