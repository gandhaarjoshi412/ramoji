"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import { EventReport } from "@/types";
import { ArrowLeft, Printer, FileText, ShieldCheck } from "lucide-react";

export default function EventReportPage() {
  const params = useParams();
  const eventId = Number(params?.id);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [report, setReport] = useState<EventReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (eventId) {
        setLoading(true);
        apiRequest<EventReport>(`/api/events/${eventId}/report`)
          .then((res) => setReport(res))
          .catch((err) => setError(err.message || "Failed to load report"))
          .finally(() => setLoading(false));
      }
    }
  }, [eventId, user, authLoading, router]);

  const handlePrint = () => {
    window.print();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-[#0f2942] animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Generating Culinary Audit Report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error || "Report could not be generated."}
        </div>
        <Link href={`/events/${eventId}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-900 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Return to Banquet Event
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Non-printable Top Action Bar */}
      <div className="no-print flex items-center justify-between border-b border-slate-200 pb-4">
        <Link
          href={`/events/${eventId}`}
          className="hotel-btn-secondary text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Banquet Event
        </Link>

        <button
          onClick={handlePrint}
          className="hotel-btn-gold text-xs"
        >
          <Printer className="w-4 h-4" /> Print Official Audit Document / PDF
        </button>
      </div>

      {/* Printable Report Document Card */}
      <div className="report-page bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-lg print:p-0 print:border-none print:shadow-none space-y-8">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#b48324] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#b48324]" />
              {report.hotel_name} — Culinary Audit & Yield Division
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              BANQUET FOOD WASTE & COST AUDIT
            </h1>
            {report.hotel_address && (
              <p className="text-xs text-slate-500 font-normal">{report.hotel_address}</p>
            )}
          </div>
          <div className="text-left sm:text-right text-xs text-slate-500 font-normal space-y-0.5 border-l-2 sm:border-l-0 sm:border-r-2 border-slate-200 pl-3 sm:pl-0 sm:pr-3">
            <div>Report Ref: <strong className="text-slate-900 font-mono">#BFW-{report.event_id}-{new Date().getFullYear()}</strong></div>
            <div>Generated: <strong>{new Date(report.generated_at).toLocaleString("en-IN")}</strong></div>
            <div className="capitalize font-bold text-[#064e3b]">Audit Status: Certified</div>
          </div>
        </div>

        {/* Event Meta Information */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-400 block text-[10px]">Banquet Event</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{report.event_name}</span>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-400 block text-[10px]">Event Date</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{report.event_date}</span>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-400 block text-[10px]">Event Type</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{report.event_type}</span>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-400 block text-[10px]">Guests Served</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {report.actual_guests} <span className="font-normal text-slate-500 text-xs">/ {report.expected_guests} expected</span>
            </span>
          </div>
        </div>

        {/* Executive Summary Metrics Grid */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#b48324]" />
            Key Operational Production & Waste Metrics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Food Prepared</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {formatKg(report.total_food_prepared_kg)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Total Waste</span>
              <span className="text-xl font-bold text-[#881337] mt-1 block">
                {formatKg(report.total_food_waste_kg)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Waste Rate</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {report.waste_rate_percentage}%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Waste / Guest</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {report.waste_per_guest_grams} <span className="text-xs font-normal text-slate-500">g</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-900 uppercase block">Cost Loss</span>
              <span className="text-xl font-bold text-[#c2410c] mt-1 block">
                {formatINR(report.estimated_waste_cost)}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Food-by-Food Table */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Food-by-Food Leftover Breakdown & Procurement Loss
          </h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 font-bold uppercase text-slate-600 tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Food Item</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Prepared</th>
                  <th className="py-3 px-3 text-right">Leftover</th>
                  <th className="py-3 px-3 text-right">Loss %</th>
                  <th className="py-3 px-3 text-right">Cost/kg</th>
                  <th className="py-3 px-4 text-right">Waste Cost</th>
                  <th className="py-3 px-4">Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.food_breakdown.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.food_name}</td>
                    <td className="py-3 px-3 text-slate-600">{item.category}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700">{item.prepared_kg} kg</td>
                    <td className="py-3 px-3 text-right font-bold text-[#881337]">
                      {item.leftover_kg > 0 ? `${item.leftover_kg} kg` : "0 kg"}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800">{item.waste_percentage}%</td>
                    <td className="py-3 px-3 text-right text-slate-600">₹{item.cost_per_kg}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatINR(item.waste_cost)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {item.primary_reason || "Service leftover"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td colSpan={2} className="py-3 px-4">AUDIT TOTALS:</td>
                  <td className="py-3 px-3 text-right">{report.total_food_prepared_kg} kg</td>
                  <td className="py-3 px-3 text-right text-[#881337]">{report.total_food_waste_kg} kg</td>
                  <td className="py-3 px-3 text-right">{report.waste_rate_percentage}%</td>
                  <td className="py-3 px-3 text-right">—</td>
                  <td className="py-3 px-4 text-right text-[#c2410c]">{formatINR(report.estimated_waste_cost)}</td>
                  <td className="py-3 px-4">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Waste Reasons Distribution */}
        {report.waste_reasons_breakdown.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Identified Root Causes of Leftovers
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {report.waste_reasons_breakdown.map((r, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <div className="font-bold text-slate-900">{r.reason}</div>
                  <div className="text-slate-600 font-semibold mt-1">
                    {r.total_waste_kg} kg ({r.percentage}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Executive Sign-off and Verification Footer */}
        <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-500">
          <div>
            <div className="h-14 border-b-2 border-slate-300 mb-2"></div>
            <div className="font-bold text-slate-900">Executive Chef / Kitchen Production Steward</div>
            <div>Measurement Verification & Signature</div>
          </div>
          <div>
            <div className="h-14 border-b-2 border-slate-300 mb-2"></div>
            <div className="font-bold text-slate-900">Banquet Operations Director</div>
            <div>Audit Approval & Authorization</div>
          </div>
        </div>

        {/* Operational Disclaimer */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 italic">
            &quot;{report.disclaimer}&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
