"use client";

import React from "react";
import { formatKg } from "@/lib/api";
import { MassBalanceAuditData } from "@/types/analytics";
import { PackageOpen, Recycle, ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

interface LeftoverReuseSectionProps {
  totalProductionKg: number;
  buffetLeftoverKg: number;
  kitchenLeftoverKg: number;
  totalLeftoverKg: number;
  reuseKg: number;
  finalWasteKg: number;
  massBalanceAudit?: MassBalanceAuditData;
}

export const LeftoverReuseSection: React.FC<LeftoverReuseSectionProps> = ({
  totalProductionKg,
  buffetLeftoverKg,
  kitchenLeftoverKg,
  totalLeftoverKg,
  reuseKg,
  finalWasteKg,
  massBalanceAudit,
}) => {
  const prod = totalProductionKg || 1;
  const leftoverRate = ((totalLeftoverKg / prod) * 100).toFixed(1);
  const reuseRate = totalLeftoverKg > 0 ? ((reuseKg / totalLeftoverKg) * 100).toFixed(1) : "0.0";

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Leftover Separation & Safe Food Reuse
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict operational distinction between unserved kitchen hot-holds, buffet floor returns, and compliant repurposed food
          </p>
        </div>

        <div className="px-3.5 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-xs font-bold text-teal-900 self-start sm:self-auto flex items-center gap-2">
          <Recycle className="w-4 h-4 text-teal-600" />
          <span>{formatKg(reuseKg)} Safely Diverted from Bin</span>
        </div>
      </div>

      {/* 4 Partition Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kitchen Leftover */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Kitchen Leftover
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
              Back of House
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900">
            {formatKg(kitchenLeftoverKg)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Held in temperature-controlled kitchen pots before serving line.
          </p>
        </div>

        {/* Buffet Leftover */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Buffet Returns
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
              Chafing Dishes
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900">
            {formatKg(buffetLeftoverKg)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Returned from service stations after banquet closing.
          </p>
        </div>

        {/* Reused Food */}
        <div className="p-4 bg-teal-50/70 rounded-xl border border-teal-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
              Food Reused
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-teal-200 text-teal-900">
              {reuseRate}% Leftover
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-teal-900">
            {formatKg(reuseKg)}
          </div>
          <p className="text-[11px] text-teal-800 mt-1">
            Repurposed according to hotel F&B food hygiene standards.
          </p>
        </div>

        {/* Final Waste */}
        <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
              Final Landfill Waste
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-200 text-rose-900">
              Discarded
            </span>
          </div>
          <div className="mt-2 text-xl font-black text-rose-900">
            {formatKg(finalWasteKg)}
          </div>
          <p className="text-[11px] text-rose-800 mt-1">
            Unavoidable disposal after accounting for safe reuse.
          </p>
        </div>
      </div>

      {/* Traceable Food Mass-Balance Audit (Master Prompt Part B / Example 1) */}
      {massBalanceAudit && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 ${
            massBalanceAudit.is_reconciled
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
              : "bg-amber-50/80 border-amber-300 text-amber-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              {massBalanceAudit.is_reconciled ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              <span>Food Mass-Balance Conservation Law Audit</span>
            </div>
            <span className="font-mono text-[11px] font-bold">
              Leftover Variance: {massBalanceAudit.leftover_variance_kg.toFixed(2)} kg
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-current/15">
            <div>
              <span className="opacity-75 block">Production Balance:</span>
              <strong>
                Cooked ({formatKg(massBalanceAudit.total_prepared_kg)}) = Eaten ({formatKg(massBalanceAudit.total_consumed_kg)}) + Leftover ({formatKg(massBalanceAudit.total_leftover_kg)})
              </strong>
            </div>
            <div>
              <span className="opacity-75 block">Leftover Disposition Balance:</span>
              <strong>
                Leftover ({formatKg(massBalanceAudit.total_leftover_kg)}) = Reused ({formatKg(massBalanceAudit.total_reuse_kg)}) + Waste ({formatKg(massBalanceAudit.total_waste_kg)})
                {Math.abs(massBalanceAudit.leftover_variance_kg) > 0.05 && (
                  <span className="text-amber-800 font-bold">
                    {" "}• Variance: {massBalanceAudit.leftover_variance_kg.toFixed(2)} kg
                  </span>
                )}
              </strong>
            </div>
          </div>
        </div>
      )}

      <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs text-slate-600 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Food Safety Protocol:</strong> Leftover food is tracked for operational intelligence. Reuse is strictly subjected to HACCP temperature audits and blast-chilling compliance before re-service.
        </span>
      </div>
    </div>
  );
};
