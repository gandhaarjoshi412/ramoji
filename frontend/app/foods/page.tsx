"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { FoodItem } from "@/types";
import { Apple, PlusCircle, Edit3, Trash2, Sliders, Check } from "lucide-react";

export default function FoodsPage() {
  const { user } = useAuth();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);

  // Edit calibration modal state
  const [density, setDensity] = useState("");
  const [depth, setDepth] = useState("");
  const [calib, setCalib] = useState("");

  const fetchFoods = () => {
    setLoading(true);
    apiRequest<FoodItem[]>("/api/foods")
      .then((data) => setFoods(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const openEdit = (food: FoodItem) => {
    setEditingFood(food);
    setDensity(food.density_g_per_cm3.toString());
    setDepth(food.default_depth_cm.toString());
    setCalib(food.calibration_factor.toString());
  };

  const saveEdit = async () => {
    if (!editingFood) return;
    try {
      await apiRequest(`/api/foods/${editingFood.id}`, {
        method: "PUT",
        body: JSON.stringify({
          density_g_per_cm3: parseFloat(density) || 0.85,
          default_depth_cm: parseFloat(depth) || 4.0,
          calibration_factor: parseFloat(calib) || 1.0,
        }),
      });
      setEditingFood(null);
      fetchFoods();
    } catch (err: any) {
      alert(err.message || "Failed to update estimation settings");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Food Items & Quantity Calibration
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Physical density and pan depth parameters used by the AI camera quantity estimator
          </p>
        </div>
      </div>

      {/* Foods Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Food Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Physical Density (g/cm³)</th>
                <th className="py-3.5 px-4 text-right">Default Depth (cm)</th>
                <th className="py-3.5 px-4 text-right">Calibration Factor</th>
                <th className="py-3.5 px-4 text-right">Recipe Cost / g</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {foods.map((food) => (
                <tr key={food.id} className="hover:bg-slate-50/50">
                  <td className="py-4 px-6 font-bold text-slate-900">{food.name}</td>
                  <td className="py-4 px-4">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {food.category}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-black text-slate-800">
                    {food.density_g_per_cm3} g/cm³
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-slate-700">
                    {food.default_depth_cm} cm
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-emerald-700">
                    ×{food.calibration_factor}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-slate-900">
                    ₹{food.cost_per_gram.toFixed(3)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => openEdit(food)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Calibrate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Calibration Modal */}
      {editingFood && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900">
              Calibrate Estimation: {editingFood.name}
            </h3>
            <p className="text-xs text-slate-500">
              Tune physical density and serving vessel depth parameters for volume-to-gram conversion.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Density (g/cm³)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={density}
                  onChange={(e) => setDensity(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">e.g. Biryani: 0.85, Paneer: 1.05, Rice: 0.90</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Default Pan Depth (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Average depth of chafing dish pan</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Calibration Factor (Multiplier)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={calib}
                  onChange={(e) => setCalib(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Fine-tuning multiplier (1.0 default)</p>
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setEditingFood(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
