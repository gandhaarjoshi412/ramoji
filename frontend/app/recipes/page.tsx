"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR } from "@/lib/api";
import { Recipe } from "@/types";
import { BookOpen, Utensils, Layers } from "lucide-react";

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
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Recipes & Batch Costing Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {recipes.length} Standard Recipes
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Raw ingredient procurement pricing, cooked batch yields, and kitchen production cost per gram
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recipes.map((r) => (
          <div key={r.id} className="hotel-card p-6 sm:p-7 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">{r.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 inline-block mt-1">
                    Dish: {r.food_item_name || "Unlinked"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Cost / Gram</span>
                  <span className="font-serif text-2xl font-bold text-emerald-700">
                    ₹{r.cost_per_gram.toFixed(3)} <span className="text-xs font-sans font-normal text-slate-400">/ g</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-400 block uppercase text-[10px] tracking-wider">Expected Cooked Yield</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {r.expected_yield_grams.toLocaleString()} g <span className="text-xs font-normal text-slate-500">({(r.expected_yield_grams / 1000).toFixed(1)} kg)</span>
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase text-[10px] tracking-wider">Total Batch Cost</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                    {formatINR(r.total_batch_cost)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  Ingredient Composition ({r.ingredients.length} items)
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs bg-slate-50/50">
                  {r.ingredients.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                      <span className="font-semibold text-slate-800">{item.ingredient?.name || "Ingredient"}</span>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{item.quantity} {item.unit}</span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          (@ ₹{item.ingredient?.cost_per_unit}/{item.ingredient?.unit})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {r.notes && (
              <p className="text-[11px] text-slate-500 italic font-normal pt-2 border-t border-slate-100">&quot;{r.notes}&quot;</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
