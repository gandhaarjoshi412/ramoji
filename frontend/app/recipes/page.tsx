"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR } from "@/lib/api";
import { Recipe } from "@/types";
import { BookOpen, Utensils, DollarSign, Layers } from "lucide-react";

export default function RecipesPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Recipe[]>("/api/recipes")
      .then((data) => setRecipes(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Banquet Recipes & Cost Engine
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Ingredient breakdown, cooked batch yields, and calculated production cost per gram
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recipes.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">{r.name}</h3>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Menu Item: {r.food_item_name || "Unlinked"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Cost / Gram</span>
                <span className="text-xl font-black text-slate-900">
                  ₹{r.cost_per_gram.toFixed(3)} <span className="text-xs font-bold text-slate-500">/ g</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 text-xs">
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[10px]">Expected Cooked Yield</span>
                <span className="font-black text-slate-900 text-sm">
                  {r.expected_yield_grams.toLocaleString()} g ({(r.expected_yield_grams / 1000).toFixed(1)} kg)
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[10px]">Total Batch Cost</span>
                <span className="font-black text-emerald-800 text-sm">
                  {formatINR(r.total_batch_cost)}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Ingredient Composition ({r.ingredients.length} items)
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                {r.ingredients.map((item) => (
                  <div key={item.id} className="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50/50">
                    <span className="font-semibold text-slate-800">{item.ingredient?.name || "Ingredient"}</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">{item.quantity} {item.unit}</span>
                      <span className="text-[11px] text-slate-400 block">
                        (@ ₹{item.ingredient?.cost_per_unit}/{item.ingredient?.unit})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {r.notes && (
              <p className="text-[11px] text-slate-400 italic">"{r.notes}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
