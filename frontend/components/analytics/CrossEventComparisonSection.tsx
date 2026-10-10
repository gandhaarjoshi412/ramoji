"use client";

import React, { useState } from "react";
import { CrossEventComparison, CrossEventProfile } from "@/types/analytics";
import { formatKg } from "@/lib/api";
import {
  UtensilsCrossed,
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Briefcase,
  Heart,
  PartyPopper,
  Mic,
  Building2,
  Info,
  ArrowRight,
  Flame,
  ChefHat,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CrossEventComparisonSectionProps {
  comparisonData?: CrossEventComparison;
}

export const CrossEventComparisonSection: React.FC<CrossEventComparisonSectionProps> = ({
  comparisonData,
}) => {
  const [selectedEventType, setSelectedEventType] = useState<string>("Corporate");
  const [expandedDetails, setExpandedDetails] = useState<boolean>(true);

  if (!comparisonData || !comparisonData.profiles || comparisonData.profiles.length === 0) {
    return null;
  }

  const profiles = comparisonData.profiles;
  const activeProfile =
    profiles.find((p) => p.event_type.toLowerCase() === selectedEventType.toLowerCase()) ||
    profiles[0];

  const getProfileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "corporate":
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case "wedding":
        return <Heart className="w-4 h-4 text-rose-600" />;
      case "social":
        return <PartyPopper className="w-4 h-4 text-amber-600" />;
      case "conference":
        return <Mic className="w-4 h-4 text-purple-600" />;
      default:
        return <Building2 className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getProfileColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "corporate":
        return "border-blue-200 bg-blue-50/40 text-blue-900";
      case "wedding":
        return "border-rose-200 bg-rose-50/40 text-rose-900";
      case "social":
        return "border-amber-200 bg-amber-50/40 text-amber-900";
      case "conference":
        return "border-purple-200 bg-purple-50/40 text-purple-900";
      default:
        return "border-emerald-200 bg-emerald-50/40 text-emerald-900";
    }
  };

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/80 mb-1.5">
            <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-600" />
            Cross-Event Audience Appetite Intelligence
          </div>
          <h3 className="font-serif text-lg font-bold text-slate-900 tracking-tight">
            What Different Audiences Actually Eat: Corporate vs. Wedding vs. Social
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl leading-relaxed">
            Empirical comparative analysis of guest dining habits. Understand why corporate attendees leave heavy starches untouched while wedding banquets experience hearty appetites and sweet-tooth plate clearance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpandedDetails(!expandedDetails)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all cursor-pointer shrink-0 self-start md:self-center"
        >
          {expandedDetails ? (
            <>
              <span>Collapse Comparison</span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            </>
          ) : (
            <>
              <span>Expand Comparison</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </>
          )}
        </button>
      </div>

      {/* Headline Empirical Takeaway Highlight */}
      <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl text-white space-y-2 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Key Operational Finding
        </div>
        <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-100">
          {comparisonData.core_finding}
        </p>
      </div>

      {expandedDetails && (
        <div className="space-y-6 pt-1">
          {/* Executive Quick Contrast Metric Cards: Corporate vs. Wedding vs. Social */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {profiles.slice(0, 3).map((p) => {
              const hasData = p.has_data !== false && (p.records_count ?? 1) > 0 && p.guest_count > 0;
              const typeLower = p.event_type.toLowerCase();
              const borderColor =
                typeLower === "corporate"
                  ? "border-blue-200/80 bg-blue-50/30"
                  : typeLower === "wedding"
                  ? "border-rose-200/80 bg-rose-50/30"
                  : "border-amber-200/80 bg-amber-50/30";
              const titleColor =
                typeLower === "corporate"
                  ? "text-blue-900"
                  : typeLower === "wedding"
                  ? "text-rose-900"
                  : "text-amber-900";
              const badgeColor =
                typeLower === "corporate"
                  ? "bg-blue-100 text-blue-800"
                  : typeLower === "wedding"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800";

              return (
                <div key={p.event_type} className={`p-4 rounded-xl border ${borderColor} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${titleColor}`}>
                      {getProfileIcon(p.event_type)}
                      {p.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${hasData ? badgeColor : "bg-slate-200 text-slate-700"}`}>
                      {hasData ? p.tagline : "Baseline Not Set"}
                    </span>
                  </div>

                  {hasData ? (
                    <>
                      <div className="space-y-1">
                        <div className="text-2xl font-serif font-bold text-slate-900">
                          {p.consumption_rate_pct.toFixed(1)}%{" "}
                          <span className="text-xs font-sans font-normal text-slate-500">
                            consumed
                          </span>
                        </div>
                        <div className={`text-[11px] font-semibold ${p.waste_rate_pct > 20 ? "text-rose-700" : "text-emerald-700"}`}>
                          {p.waste_rate_pct.toFixed(1)}% Discarded Waste Rate
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-slate-200/60">
                        <strong>Intake:</strong> {p.intake_per_guest_g.toFixed(0)}g / guest. {p.behavior_summary}
                      </div>
                    </>
                  ) : (
                    <div className="py-2 space-y-2">
                      <div className="text-xs font-semibold text-slate-500">
                        Insufficient Banquet Records Logged
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {p.behavior_summary || "Operational baseline requires at least 3 comparable events to establish consumption metrics."}
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Events: {p.records_count ?? 0} • Logged Guests: {p.guest_count}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Event Type Interactive Selector Bar */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Explore Event Audience Profile
              </span>
              <span className="text-[11px] text-slate-500">
                Click any audience to inspect detailed food item consumption
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {profiles.map((p) => {
                const isSelected =
                  p.event_type.toLowerCase() === selectedEventType.toLowerCase();
                return (
                  <button
                    key={p.event_type}
                    type="button"
                    onClick={() => setSelectedEventType(p.event_type)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs font-bold"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {getProfileIcon(p.event_type)}
                    <span>{p.title.split("&")[0].trim()}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.consumption_rate_pct.toFixed(0)}% eaten
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Audience Profile Detail Card */}
          {activeProfile && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-base font-bold text-slate-900">
                      {activeProfile.title}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-700">
                      {activeProfile.tagline}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {activeProfile.behavior_summary}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Consumption Rate
                    </span>
                    <span className="text-lg font-serif font-bold text-emerald-700">
                      {activeProfile.consumption_rate_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-right pl-3 border-l border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Avg Guest Intake
                    </span>
                    <span className="text-lg font-serif font-bold text-slate-900">
                      {activeProfile.intake_per_guest_g.toFixed(0)}g
                    </span>
                  </div>
                </div>
              </div>

              {/* What They Eat More vs. What They Eat Less (Side-by-Side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* WHAT THEY EAT MORE */}
                <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/70 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Dishes Eaten MORE by this Audience (High Demand)</span>
                  </div>

                  <div className="space-y-2.5">
                    {activeProfile.eaten_more.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-lg border border-emerald-100 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            {item.dish_name}
                          </span>
                          <span className="font-mono font-bold text-emerald-700">
                            {item.consumption_rate_pct.toFixed(1)}% eaten
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, item.consumption_rate_pct)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {item.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WHAT THEY EAT LESS */}
                <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-200/70 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Dishes Eaten LESS / Overproduced (High Leftover)</span>
                  </div>

                  <div className="space-y-2.5">
                    {activeProfile.eaten_less.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-lg border border-rose-100 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            {item.dish_name}
                          </span>
                          <span className="font-mono font-bold text-rose-700">
                            {item.waste_rate_pct ? `${item.waste_rate_pct.toFixed(1)}% waste` : `${item.consumption_rate_pct.toFixed(1)}% eaten`}
                          </span>
                        </div>
                        {/* Progress Bar for Waste */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                item.waste_rate_pct || 100 - item.consumption_rate_pct
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {item.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kitchen Guidance Banner */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5 shadow-2xs">
                <ChefHat className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 font-semibold">
                    Kitchen & Recipe Planning Action:{" "}
                  </strong>
                  <span>{activeProfile.kitchen_guidance}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cross-Event Category Head-to-Head Comparison Matrix */}
          {comparisonData.head_to_head_comparisons &&
            comparisonData.head_to_head_comparisons.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-sm font-bold text-slate-900">
                    Food Category Contrast Matrix: Corporate vs. Wedding vs. Social
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Percentage of food cooked that is actually eaten
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <th className="py-2.5 px-3.5">Food Group</th>
                        <th className="py-2.5 px-3.5">Corporate Meeting</th>
                        <th className="py-2.5 px-3.5">Wedding Banquet</th>
                        <th className="py-2.5 px-3.5">Social Celebration</th>
                        <th className="py-2.5 px-3.5">Key Operational Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {comparisonData.head_to_head_comparisons.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3.5 font-bold text-slate-900">
                            {row.dish_category}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono font-bold ${
                                  row.corporate.pickup_pct < 50
                                    ? "text-rose-700"
                                    : "text-slate-800"
                                }`}
                              >
                                {row.corporate.pickup_pct.toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({row.corporate.assessment})
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono font-bold ${
                                  row.wedding.pickup_pct >= 85
                                    ? "text-emerald-700"
                                    : "text-slate-800"
                                }`}
                              >
                                {row.wedding.pickup_pct.toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({row.wedding.assessment})
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-emerald-700">
                                {row.social.pickup_pct.toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({row.social.assessment})
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 text-[11px] leading-relaxed max-w-xs">
                            {row.key_takeaway}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
