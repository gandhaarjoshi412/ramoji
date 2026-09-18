"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR } from "@/lib/api";
import { Ingredient } from "@/types";
import { Edit3, Check, X } from "lucide-react";

export default function IngredientsPage() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick edit cost modal
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [costInput, setCostInput] = useState("");

  const fetchIngredients = () => {
    setLoading(true);
    apiRequest<Ingredient[]>("/api/ingredients")
      .then((data) => setIngredients(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const saveCost = async () => {
    if (!editingItem) return;
    try {
      await apiRequest(`/api/ingredients/${editingItem.id}`, {
        method: "PUT",
        body: JSON.stringify({ cost_per_unit: parseFloat(costInput) || 0 }),
      });
      setEditingItem(null);
      fetchIngredients();
    } catch (err: any) {
      alert(err.message || "Failed to update cost");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Raw Ingredient Purchase Rates
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {ingredients.length} Commodities
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Baseline procurement contract rates used to dynamically compute kitchen batch costing
          </p>
        </div>
      </div>

      <div className="hotel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Ingredient Commodity</th>
                <th className="py-3.5 px-4">Base Unit</th>
                <th className="py-3.5 px-4 text-right">Procurement Cost</th>
                <th className="py-3.5 px-4 text-right">Effective Cost / g</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ingredients.map((ing) => {
                const costPerG = ing.unit.toLowerCase() === "kg" || ing.unit.toLowerCase() === "l" 
                  ? ing.cost_per_unit / 1000.0 
                  : ing.cost_per_unit;

                return (
                  <tr key={ing.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">{ing.name}</td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                        {ing.unit}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900">
                      {formatINR(ing.cost_per_unit)} <span className="text-xs font-normal text-slate-400">/ {ing.unit}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-slate-600">
                      ₹{costPerG.toFixed(4)} / g
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          setEditingItem(ing);
                          setCostInput(ing.cost_per_unit.toString());
                        }}
                        className="hotel-btn-secondary text-[11px] py-1 px-2.5 rounded-md"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Update Rate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Rate Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="hotel-card bg-white max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Update Rate: {editingItem.name}
              </h3>
              <p className="text-xs text-slate-500 font-normal">
                Contract purchase price per {editingItem.unit}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Rate (₹ / {editingItem.unit})
              </label>
              <input
                type="number"
                step="0.5"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingItem(null)}
                className="hotel-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={saveCost}
                className="hotel-btn-emerald text-xs active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                Save Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
