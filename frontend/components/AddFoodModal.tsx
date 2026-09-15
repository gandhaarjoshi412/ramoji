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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="hotel-card bg-white max-w-md w-full p-6 sm:p-7 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#0f2942] flex items-center justify-center border border-slate-200">
            <Utensils className="w-5 h-5 text-[#0f2942]" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-slate-900">Add Menu Item</h2>
            <p className="text-xs text-slate-500 font-normal">
              Specify banquet food item and batch preparation weight
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsCustom(false)}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                !isCustom ? "bg-white shadow-xs text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Standard Menu
            </button>
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                isCustom ? "bg-white shadow-xs text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              + Custom Item
            </button>
          </div>

          {!isCustom ? (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Food Dish
              </label>
              <select
                value={selectedCatalogId}
                onChange={(e) => handleCatalogChange(Number(e.target.value))}
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 cursor-pointer"
              >
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category}) — ₹{item.default_cost_per_kg}/kg
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Food Item Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabadi Dum Biryani"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required={isCustom}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Prepared Weight (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                placeholder="e.g. 50"
                value={preparedWeight}
                onChange={(e) => setPreparedWeight(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Cost Rate (₹/kg)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 180"
                value={costPerKg}
                onChange={(e) => setCostPerKg(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Kitchen Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Cooked in 2 batches for Buffet Station 1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="hotel-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="hotel-btn-gold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {loading ? "Adding..." : "Add to Banquet Menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
