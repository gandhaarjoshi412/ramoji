"use client";

import React, { useState } from "react";
import { ManagementInsight } from "@/types/analytics";
import {
  Sparkles,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Info,
  ArrowRight,
  Filter,
} from "lucide-react";

interface ManagementInsightsSectionProps {
  executiveSummary: string;
  insights: ManagementInsight[];
}

type PriorityFilter = "All" | "Critical" | "Attention" | "Performing Well" | "Information";

export const ManagementInsightsSection: React.FC<ManagementInsightsSectionProps> = ({
  executiveSummary,
  insights,
}) => {
  const [filter, setFilter] = useState<PriorityFilter>("All");

  const filteredInsights =
    filter === "All" ? insights : insights.filter((i) => i.priority === filter);

  const getPriorityBadge = (priority: ManagementInsight["priority"]) => {
    switch (priority) {
      case "Critical":
        return {
          icon: <Flame className="w-4 h-4 text-rose-600" />,
          badge: "bg-rose-100 text-rose-800 border-rose-200",
          cardBorder: "border-rose-200/90 bg-rose-50/20",
          titleColor: "text-rose-950",
        };
      case "Attention":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          badge: "bg-amber-100 text-amber-800 border-amber-200",
          cardBorder: "border-amber-200/90 bg-amber-50/20",
          titleColor: "text-amber-950",
        };
      case "Performing Well":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
          cardBorder: "border-emerald-200/90 bg-emerald-50/20",
          titleColor: "text-emerald-950",
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-blue-600" />,
          badge: "bg-blue-100 text-blue-800 border-blue-200",
          cardBorder: "border-blue-200/90 bg-blue-50/20",
          titleColor: "text-blue-950",
        };
    }
  };

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-6">
      {/* Header and Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Operational Intelligence & AI Action Plan
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Rules-driven observations and concrete kitchen interventions derived directly from recorded banquet datasets
          </p>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {(["All", "Critical", "Attention", "Performing Well", "Information"] as PriorityFilter[]).map(
            (p) => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filter === p
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>
      </div>

      {/* Executive Summary Callout Banner */}
      {executiveSummary && (
        <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-start gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              Executive Briefing
            </span>
            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
              {executiveSummary}
            </p>
          </div>
        </div>
      )}

      {/* Actionable Insight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInsights.map((insight) => {
          const style = getPriorityBadge(insight.priority);

          return (
            <div
              key={insight.id}
              className={`p-5 rounded-2xl border ${style.cardBorder} space-y-3 flex flex-col justify-between transition-all hover:shadow-xs`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {style.icon}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {insight.category}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${style.badge}`}
                  >
                    {insight.priority}
                  </span>
                </div>

                <h4 className={`text-sm font-bold mt-2 ${style.titleColor}`}>
                  {insight.title}
                </h4>

                {/* Observation */}
                <div className="mt-2.5 text-xs text-slate-700 leading-relaxed font-medium">
                  <strong className="text-slate-900">Observation: </strong>
                  {insight.observation}
                </div>

                {/* Supporting Metric */}
                <div className="mt-1.5 p-2 bg-white/70 rounded-lg border border-slate-200/60 font-mono text-[11px] text-slate-600">
                  <span className="text-slate-400 font-semibold mr-1">Data Metric:</span>
                  {insight.reason_metric}
                </div>
              </div>

              {/* Action / Recommendation */}
              <div className="pt-3 border-t border-slate-200/60 text-xs">
                <div className="flex items-start gap-1.5 text-emerald-950 font-semibold">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-emerald-700 font-bold uppercase tracking-wider text-[10px] block">
                      Recommended Action
                    </span>
                    {insight.recommendation}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
