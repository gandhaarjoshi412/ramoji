"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import { EventReport } from "@/types";
import { ArrowLeft, Printer, Utensils, AlertCircle } from "lucide-react";

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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="text-sm text-slate-500 font-medium">Generating official banquet food waste report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-red-50 text-red-700 font-medium">
          {error || "Report could not be generated."}
        </div>
        <Link href={`/events/${eventId}`} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Return to Event
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Non-printable Action Bar */}
      <div className="no-print flex items-center justify-between border-b border-slate-200 pb-4">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Banquet Event
        </Link>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Printable Report Document Card */}
      <div className="report-page bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none space-y-8">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-emerald-700 mb-1">
              {report.hotel_name}
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              BANQUET FOOD WASTE AUDIT REPORT
            </h1>
            {report.hotel_address && (
              <p className="text-xs text-slate-500 mt-1">{report.hotel_address}</p>
            )}
          </div>
          <div className="text-left sm:text-right text-xs text-slate-500 font-medium">
            <div>Report ID: #BFW-{report.event_id}-{new Date().getFullYear()}</div>
            <div>Generated: {new Date(report.generated_at).toLocaleString("en-IN")}</div>
            <div className="capitalize font-bold text-slate-700 mt-0.5">Status: {report.status}</div>
          </div>
        </div>

        {/* Event Meta Information */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="font-bold uppercase text-slate-400 block">Banquet Event</span>
            <span className="font-black text-slate-900 text-sm">{report.event_name}</span>
          </div>
          <div>
            <span className="font-bold uppercase text-slate-400 block">Event Date</span>
            <span className="font-black text-slate-900 text-sm">{report.event_date}</span>
          </div>
          <div>
            <span className="font-bold uppercase text-slate-400 block">Event Type</span>
            <span className="font-black text-slate-900 text-sm">{report.event_type}</span>
          </div>
          <div>
            <span className="font-bold uppercase text-slate-400 block">Guests (Actual / Expected)</span>
            <span className="font-black text-slate-900 text-sm">
              {report.actual_guests} <span className="font-normal text-slate-500">/ {report.expected_guests}</span>
            </span>
          </div>
        </div>

        {/* Executive Summary Metrics Grid */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
            Key Operational Waste Metrics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Food Prepared</span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {formatKg(report.total_food_prepared_kg)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-red-50/70 border border-red-200">
              <span className="text-[11px] font-bold text-red-800 uppercase block">Total Waste</span>
              <span className="text-2xl font-black text-red-700 mt-0.5 block">
                {formatKg(report.total_food_waste_kg)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Waste Rate</span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {report.waste_rate_percentage}%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Waste / Guest</span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {report.waste_per_guest_grams} <span className="text-sm font-bold">g</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-900 uppercase block">Estimated Loss</span>
              <span className="text-2xl font-black text-emerald-900 mt-0.5 block">
                {formatINR(report.estimated_waste_cost)}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Food-by-Food Table */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
            Food-by-Food Breakdown & Leftover Measurements
          </h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 font-bold uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Food Item</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Prepared (kg)</th>
                  <th className="py-3 px-3 text-right">Leftover (kg)</th>
                  <th className="py-3 px-3 text-right">Waste %</th>
                  <th className="py-3 px-3 text-right">Cost/kg</th>
                  <th className="py-3 px-4 text-right">Waste Cost</th>
                  <th className="py-3 px-4">Primary Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.food_breakdown.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.food_name}</td>
                    <td className="py-3 px-3 text-slate-600">{item.category}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700">{item.prepared_kg} kg</td>
                    <td className="py-3 px-3 text-right font-black text-red-600">
                      {item.leftover_kg > 0 ? `${item.leftover_kg} kg` : "0 kg"}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{item.waste_percentage}%</td>
                    <td className="py-3 px-3 text-right text-slate-600">₹{item.cost_per_kg}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatINR(item.waste_cost)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {item.primary_reason || "None recorded"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                <tr>
                  <td colSpan={2} className="py-3 px-4">TOTALS:</td>
                  <td className="py-3 px-3 text-right">{report.total_food_prepared_kg} kg</td>
                  <td className="py-3 px-3 text-right text-red-600">{report.total_food_waste_kg} kg</td>
                  <td className="py-3 px-3 text-right">{report.waste_rate_percentage}%</td>
                  <td className="py-3 px-3 text-right">—</td>
                  <td className="py-3 px-4 text-right">{formatINR(report.estimated_waste_cost)}</td>
                  <td className="py-3 px-4">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Waste Reasons Distribution */}
        {report.waste_reasons_breakdown.length > 0 && (
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
              Identified Causes of Leftovers
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {report.waste_reasons_breakdown.map((r, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <div className="font-bold text-slate-900">{r.reason}</div>
                  <div className="text-slate-600 font-semibold mt-1">
                    {r.total_waste_kg} kg ({r.percentage}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sign-off and Verification Footer */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-500">
          <div>
            <div className="h-12 border-b border-slate-300 mb-1"></div>
            <div className="font-bold text-slate-700">Executive Chef / Kitchen Steward</div>
            <div>Measurement Verification & Signature</div>
          </div>
          <div>
            <div className="h-12 border-b border-slate-300 mb-1"></div>
            <div className="font-bold text-slate-700">Banquet Operations Manager</div>
            <div>Audit Approval & Signature</div>
          </div>
        </div>

        {/* Operational Disclaimer (Mandated in prompt Section 17) */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 italic">
            "{report.disclaimer}"
          </p>
        </div>
      </div>
    </div>
  );
}
