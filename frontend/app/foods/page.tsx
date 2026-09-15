"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { FoodItem } from "@/types";
import { Sliders, Sparkles, Scale, X, Check } from "lucide-react";

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
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Culinary Density & Optical Calibration
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {foods.length} Recipes
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Volumetric density, pan geometry, and optical multipliers for 3D camera leftover estimation
          </p>
        </div>
      </div>

      {/* Foods Table */}
      <div className="hotel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Food Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Physical Density</th>
                <th className="py-3.5 px-4 text-right">Pan Depth</th>
                <th className="py-3.5 px-4 text-right">Model Calibration</th>
                <th className="py-3.5 px-4 text-right">Batch Rate</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {foods.map((food) => (
                <tr key={food.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">{food.name}</td>
                  <td className="py-4 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {food.category}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-slate-800">
                    {food.density_g_per_cm3} <span className="text-xs font-normal text-slate-400">g/cm³</span>
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-slate-700">
                    {food.default_depth_cm} <span className="text-xs font-normal text-slate-400">cm</span>
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-[#064e3b]">
                    ×{food.calibration_factor}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-slate-900">
                    ₹{food.cost_per_gram.toFixed(3)}/g
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => openEdit(food)}
                      className="hotel-btn-secondary text-[11px] py-1 px-2.5 rounded-md"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="hotel-card bg-white max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEditingFood(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#b48324] flex items-center justify-center border border-amber-200">
                <Sliders className="w-5 h-5 text-[#b48324]" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  Calibrate: {editingFood.name}
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Refine physical volume and chafing depth parameters
                </p>
              </div>
            </div>

            <div className="space-y-3.5 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Physical Density (g/cm³)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={density}
                  onChange={(e) => setDensity(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">e.g. Biryani: 0.85, Paneer Gravy: 1.05, Dal: 1.02</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Default Pan Depth (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">Average depth of banquet chafing pan</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Calibration Multiplier
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={calib}
                  onChange={(e) => setCalib(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">Optical multiplier (1.0 default standard)</p>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-4 border-t border-slate-100">
              <button
                onClick={() => setEditingFood(null)}
                className="hotel-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="hotel-btn-gold text-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Save Calibration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
