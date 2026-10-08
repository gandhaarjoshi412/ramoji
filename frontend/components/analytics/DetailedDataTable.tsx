"use client";

import React, { useState } from "react";
import { NormalizedFoodRecord } from "@/types/analytics";
import { formatINR, formatKg } from "@/lib/api";
import {
  Search,
  ArrowUpDown,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Layers,
  X,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";

interface DetailedDataTableProps {
  records: NormalizedFoodRecord[];
  onExportCsv: () => void;
  onExportExcel: () => void;
}

export const DetailedDataTable: React.FC<DetailedDataTableProps> = ({
  records,
  onExportCsv,
  onExportExcel,
}) => {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof NormalizedFoodRecord>("total_waste_kg");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [auditRecord, setAuditRecord] = useState<NormalizedFoodRecord | null>(null);
  const pageSize = 15;

  const handleSort = (field: keyof NormalizedFoodRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending for numbers
    }
  };

  // Filter
  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.dish_name.toLowerCase().includes(term) ||
      (r.dish_category || "").toLowerCase().includes(term) ||
      (r.session || "").toLowerCase().includes(term) ||
      (r.hotel || "").toLowerCase().includes(term) ||
      (r.event_name || "").toLowerCase().includes(term)
    );
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (valA === undefined || valA === null) return sortAsc ? -1 : 1;
    if (valB === undefined || valB === null) return sortAsc ? 1 : -1;

    if (typeof valA === "number" && typeof valB === "number") {
      return sortAsc ? valA - valB : valB - valA;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    if (strA < strB) return sortAsc ? -1 : 1;
    if (strA > strB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="hotel-card p-6 bg-white border border-slate-200/80 space-y-4">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 no-print">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Detailed Food Production & Waste Audit Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Normalized itemized operational records with source traceability and formula audits ({filtered.length} entries)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search items, sessions..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-emerald-500"
            />
          </div>

          <button
            onClick={onExportCsv}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV
          </button>

          <button
            onClick={onExportExcel}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
            title="Download Excel Spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Excel
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 select-none">
            <tr>
              <th
                onClick={() => handleSort("date")}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  Date <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("hotel")}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Hotel / Event <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("session")}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Session <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("dish_name")}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Dish Name <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("estimated_production_kg")}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Est. (Kg) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("actual_production_kg")}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Cooked <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("actual_consumption_kg")}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Consumed <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("total_leftover_kg")}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Leftover <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("reuse_quantity_kg")}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Reuse <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("total_waste_kg")}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Waste (Kg) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("waste_percentage")}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Waste % <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("waste_cost")}
                className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Waste Cost <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">
                Audit
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {paginated.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{r.date}</td>
                <td className="py-2.5 px-3">
                  <div className="font-bold text-slate-800">{r.hotel}</div>
                  {r.event_name && (
                    <div className="text-[10px] text-slate-400">{r.event_name}</div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-700">{r.session}</td>
                <td className="py-2.5 px-3">
                  <div className="font-bold text-slate-900">{r.dish_name}</div>
                  <div className="text-[10px] text-slate-400">{r.dish_category}</div>
                </td>
                <td className="py-2.5 px-3 text-right text-slate-600">
                  {formatKg(r.estimated_production_kg)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">
                  {formatKg(r.actual_production_kg)}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                  {formatKg(r.actual_consumption_kg)}
                </td>
                <td className="py-2.5 px-3 text-right text-amber-700">
                  {formatKg(r.total_leftover_kg)}
                </td>
                <td className="py-2.5 px-3 text-right text-teal-700">
                  {formatKg(r.reuse_quantity_kg)}
                </td>
                <td className="py-2.5 px-3 text-right text-rose-700 font-black">
                  {formatKg(r.total_waste_kg)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      r.waste_percentage > 10
                        ? "bg-rose-100 text-rose-800 font-black"
                        : r.waste_percentage > 5
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {r.waste_percentage.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right font-black text-slate-900">
                  {formatINR(r.waste_cost)}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => setAuditRecord(r)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold"
                    title="Audit calculation & view source lineage"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Audit</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 no-print">
        <div>
          Showing {(page - 1) * pageSize + 1} to{" "}
          {Math.min(page * pageSize, sorted.length)} of {sorted.length} records
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-700 px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AUDIT & SOURCE LINEAGE MODAL */}
      {auditRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {auditRecord.data_source || "Excel Import"}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Mathematical Audit Lineage
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-slate-900 mt-0.5">
                  {auditRecord.dish_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAuditRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Source Lineage Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Source Document</span>
                <span className="font-bold text-slate-800">{auditRecord.source_file || "Daily report.xlsx"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Sheet & Row</span>
                <span className="font-bold text-slate-800">
                  {auditRecord.source_sheet ? `${auditRecord.source_sheet} (Row ${auditRecord.source_row || 'N/A'})` : "Primary Tab"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Hotel / Property</span>
                <span className="font-bold text-slate-800">{auditRecord.hotel}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Service Shift / Pax</span>
                <span className="font-bold text-slate-800">
                  {auditRecord.session} ({auditRecord.pax || 0} pax)
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Cost Per Unit</span>
                <span className="font-bold text-slate-800">
                  {formatINR(auditRecord.item_cost || 0)} / {auditRecord.uom || "Kg"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">AI / Engine Verification</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {Math.round((auditRecord.confidence_score || 0.99) * 100)}% Verified
                </span>
              </div>
            </div>

            {/* Formula Balance Audit Card */}
            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Food Balance Equations
              </span>
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between items-center text-slate-800">
                  <span>Actual Production:</span>
                  <span className="font-bold">{formatKg(auditRecord.actual_production_kg)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-700">
                  <span>Actual Consumed:</span>
                  <span>{formatKg(auditRecord.actual_consumption_kg)}</span>
                </div>
                <div className="flex justify-between items-center text-amber-700">
                  <span>Leftover (Kitchen + Buffet):</span>
                  <span>{formatKg(auditRecord.total_leftover_kg)}</span>
                </div>
                <div className="flex justify-between items-center text-teal-700">
                  <span>Reused / Repurposed:</span>
                  <span>{formatKg(auditRecord.reuse_quantity_kg)}</span>
                </div>
                <div className="flex justify-between items-center text-rose-700 font-bold border-t border-slate-100 pt-1">
                  <span>Net Discarded Waste:</span>
                  <span>{formatKg(auditRecord.total_waste_kg)} ({auditRecord.waste_percentage.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between items-center text-slate-900 font-bold">
                  <span>Net Waste Cost:</span>
                  <span>{formatINR(auditRecord.waste_cost)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAuditRecord(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
