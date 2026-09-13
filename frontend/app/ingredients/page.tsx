"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR } from "@/lib/api";
import { Ingredient } from "@/types";
import { Layers, PlusCircle, Edit3 } from "lucide-react";

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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Raw Ingredients & Purchase Pricing
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Baseline ingredient procurement rates used to dynamically calculate recipe costs per gram
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Ingredient Name</th>
                <th className="py-3.5 px-4">Base Unit</th>
                <th className="py-3.5 px-4 text-right">Cost / Unit (INR)</th>
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
                  <tr key={ing.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-bold text-slate-900">{ing.name}</td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 uppercase">
                        {ing.unit}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-black text-slate-900">
                      {formatINR(ing.cost_per_unit)} / {ing.unit}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-600">
                      ₹{costPerG.toFixed(4)} / g
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          setEditingItem(ing);
                          setCostInput(ing.cost_per_unit.toString());
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Cost
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Update Cost: {editingItem.name}
            </h3>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Rate in INR per {editingItem.unit}
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-base font-bold text-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={saveCost}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700"
              >
                Save Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
