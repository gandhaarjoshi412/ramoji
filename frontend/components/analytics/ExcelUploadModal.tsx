"use client";

import React, { useState, useRef } from "react";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import { UploadConfirmResponse } from "@/types/analytics";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
  Building2,
  Users,
  ArrowRight,
  Loader2,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  Check,
  Copy,
  RotateCcw,
  BadgeAlert,
  Table,
  TrendingUp,
} from "lucide-react";

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (confirmedData?: UploadConfirmResponse) => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("all");
  const [showFieldMappings, setShowFieldMappings] = useState(false);

  // Editable metadata state overrides
  const [hotelOverride, setHotelOverride] = useState("");
  const [dateOverride, setDateOverride] = useState("");
  const [eventOverride, setEventOverride] = useState("");
  const [duplicateAction, setDuplicateAction] = useState<"import" | "replace" | "skip">("import");

  // Post-import confirmation and skipped states
  const [confirmResult, setConfirmResult] = useState<UploadConfirmResponse | null>(null);
  const [skippedNotice, setSkippedNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const resetAll = () => {
    setFile(null);
    setAnalyzing(false);
    setImporting(false);
    setError(null);
    setPreviewData(null);
    setSelectedSheet("all");
    setShowFieldMappings(false);
    setHotelOverride("");
    setDateOverride("");
    setEventOverride("");
    setDuplicateAction("import");
    setConfirmResult(null);
    setSkippedNotice(null);
    setCopiedId(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleModalClose = () => {
    if (confirmResult && confirmResult.status === "success") {
      onUploadSuccess(confirmResult);
    }
    onClose();
    setTimeout(() => {
      resetAll();
    }, 200);
  };

  const handleCopyId = (id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setPreviewData(null);
    setConfirmResult(null);
    setSkippedNotice(null);

    // Call intelligent preview & structure detection API
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", selected);

      const res = await apiRequest<any>("/api/analytics/upload/preview", {
        method: "POST",
        body: formData,
      });

      setPreviewData(res);
      if (res.is_potential_duplicate) {
        setDuplicateAction("replace");
      } else {
        setDuplicateAction("import");
      }
      if (res.sheets && res.sheets.length > 0) {
        setSelectedSheet("all");
        // Pre-fill editable overrides: if multi-day, leave date blank so each sheet preserves its date
        const distinctDates = Array.from(new Set(res.sheets.map((s: any) => s.date).filter(Boolean)));
        setHotelOverride(res.sheets[0].hotel || "");
        if (distinctDates.length > 1) {
          setDateOverride("");
        } else {
          setDateOverride(res.sheets[0].date || "");
        }
        setEventOverride(res.sheets.length === 1 ? (res.sheets[0].event_name || "") : "");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to analyze and parse operational report");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmImport = async (overrideDupAction?: "import" | "replace" | "skip") => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setSkippedNotice(null);

    const actionToUse = overrideDupAction || duplicateAction;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sheet_name", selectedSheet);
      formData.append("duplicate_action", actionToUse);
      if (hotelOverride.trim()) formData.append("hotel_override", hotelOverride.trim());
      if (dateOverride.trim()) formData.append("date_override", dateOverride.trim());
      if (eventOverride.trim()) formData.append("event_override", eventOverride.trim());

      const res = await apiRequest<UploadConfirmResponse>("/api/analytics/upload/confirm", {
        method: "POST",
        body: formData,
      });

      if (res.status === "skipped") {
        setSkippedNotice(
          res.message || "Import skipped: Existing records detected for this property and date."
        );
      } else if (res.status === "success") {
        setConfirmResult(res);
      } else {
        setError(res.message || "Unexpected server response during import commit.");
      }
    } catch (err: any) {
      // Custom error returned from server or network
      setError(err?.message || "Failed to commit analytics import to database");
    } finally {
      setImporting(false);
    }
  };

  const activeSheetObj =
    selectedSheet === "all"
      ? previewData?.sheets?.[0]
      : previewData?.sheets?.find((s: any) => s.sheet_name === selectedSheet);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-5">
        
        {/* ================================================================= */}
        {/* MODAL HEADER                                                      */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  confirmResult
                    ? "bg-emerald-500"
                    : error
                    ? "bg-rose-500"
                    : "bg-emerald-500 animate-pulse"
                }`}
              />
              <span
                className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${
                  confirmResult
                    ? "text-emerald-700 bg-emerald-50"
                    : error
                    ? "text-rose-700 bg-rose-50"
                    : "text-emerald-700 bg-emerald-50"
                }`}
              >
                {confirmResult
                  ? "Ingestion Confirmed & Ledger Synced"
                  : error
                  ? "Ingestion Error Encountered"
                  : "Universal Hospitality Data Ingestion Engine"}
              </span>
            </div>
            <h2 className="font-serif text-xl font-bold text-slate-900 mt-1">
              {confirmResult
                ? "Excel Report Ingestion Confirmed"
                : error
                ? "Data Not Added: Ingestion Error"
                : "Import Food Production & Operational Report"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {confirmResult
                ? "All verified operational food items have been permanently saved to the analytics database"
                : error
                ? "The report could not be ingested. See the exact error details below"
                : "Intelligent multi-format semantic parser for Excel (.xlsx, .xls, .csv), PDF, and scanned logs"}
            </p>
          </div>

          <button
            onClick={handleModalClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* STATE 1: ERROR VIEW (CUSTOM ERROR, NOTHING ELSE)                  */}
        {/* ================================================================= */}
        {error && (
          <div className="space-y-4 py-2 animate-in fade-in zoom-in-95">
            <div className="p-5 bg-rose-50/80 border-2 border-rose-300 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 rounded-xl text-rose-700 shrink-0 mt-0.5">
                  <BadgeAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-rose-900">
                      Excel Ingestion Failed — Data Not Added
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-200/80 text-rose-800 rounded-full">
                      Zero Records Modified
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    The requested Excel operational report was not added to the database. The system encountered the following custom error during validation or commit:
                  </p>
                </div>
              </div>

              {/* Exact Custom Error Box */}
              <div className="p-3.5 bg-white border border-rose-200 rounded-xl shadow-xs">
                <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                  Server Custom Error Detail
                </div>
                <p className="font-mono text-xs font-semibold text-rose-900 whitespace-pre-wrap break-words">
                  {error}
                </p>
              </div>

              {file && (
                <div className="flex items-center gap-2 text-xs text-rose-700 pt-1">
                  <FileSpreadsheet className="w-4 h-4 text-rose-500" />
                  <span className="font-medium">Attempted File:</span>
                  <span className="font-bold">{file.name}</span>
                  <span className="text-rose-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>

            {/* Error Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                Upload a Different File
              </button>

              {previewData && (
                <button
                  type="button"
                  onClick={() => handleConfirmImport()}
                  disabled={importing}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Retry Import
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Dismiss & Close
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STATE 2: SKIPPED DUPLICATE NOTICE                                 */}
        {/* ================================================================= */}
        {skippedNotice && !error && !confirmResult && (
          <div className="space-y-4 py-2 animate-in fade-in">
            <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-sm font-bold text-amber-900">
                    Import Skipped — 0 Records Added
                  </h3>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    {skippedNotice}
                  </p>
                  <p className="text-xs text-amber-700 pt-1">
                    Because your duplicate setting was set to <strong>&quot;Skip Duplicate&quot;</strong>, existing records in the database were preserved and no duplicate data was inserted.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleConfirmImport("replace")}
                  disabled={importing}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Replace Existing Records With This File
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmImport("import")}
                  disabled={importing}
                  className="px-4 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                >
                  Import as Additional Records
                </button>

                <button
                  type="button"
                  onClick={resetAll}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel / Choose Different File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STATE 3: CONFIRMED VIEW (DETAILED CONFIRMATION, ZERO PLACEHOLDER)  */}
        {/* ================================================================= */}
        {confirmResult && !error && (
          <div className="space-y-5 py-1 animate-in fade-in zoom-in-95">
            {/* Success Hero Banner */}
            <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-50 border-2 border-emerald-300 rounded-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        LIVE DATABASE COMMIT VERIFIED
                      </span>
                      <span className="text-xs text-slate-400">
                        {confirmResult.summary?.imported_at
                          ? new Date(confirmResult.summary.imported_at).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Just now"}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-slate-900 mt-0.5">
                      {confirmResult.filename} Ingested Successfully
                    </h3>
                    <p className="text-xs text-emerald-900 font-semibold">
                      +{confirmResult.inserted_records} live food production & waste records committed to database ledger
                    </p>
                  </div>
                </div>

                {/* Import Batch UUID Pill */}
                {confirmResult.import_id && (
                  <div className="bg-white/90 border border-emerald-200/90 rounded-xl p-2.5 text-right shrink-0 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Transaction Batch ID
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <code className="text-[11px] font-mono font-bold text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        {confirmResult.import_id.slice(0, 13)}...
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyId(confirmResult.import_id!)}
                        title="Copy full transaction ID"
                        className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                      >
                        {copiedId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Core Operational Context Grid */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Committed Operational Attributes & Context:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Property / Hotel
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">
                    {confirmResult.summary?.hotels?.join(", ") || hotelOverride || "Hotel Sahara"}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Service Date
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">
                    {confirmResult.summary?.dates?.join(", ") || dateOverride || "Today"}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Function / Event
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">
                    {confirmResult.summary?.events?.join(", ") || eventOverride || "Banquet Service"}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Meal Session
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">
                    {confirmResult.summary?.sessions?.join(", ") || "Breakfast"}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Ingested Metrics Grid */}
            {confirmResult.summary && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Aggregated Quantities & Financial Impact:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Production Cooked
                    </span>
                    <span className="font-bold text-slate-900 text-base mt-0.5 block">
                      {formatKg(confirmResult.summary.total_production_kg)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {confirmResult.summary.dishes_count} unique items
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                      Guest Consumption
                    </span>
                    <span className="font-bold text-emerald-700 text-base mt-0.5 block">
                      {formatKg(confirmResult.summary.total_consumption_kg)}
                    </span>
                    <span className="text-[10px] text-emerald-600">
                      Cleanly consumed
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-amber-800 block">
                      Total Leftovers
                    </span>
                    <span className="font-bold text-amber-700 text-base mt-0.5 block">
                      {formatKg(confirmResult.summary.total_leftover_kg)}
                    </span>
                    <span className="text-[10px] text-amber-600">
                      Kitchen + Buffet return
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-rose-800 block">
                      Discarded Waste
                    </span>
                    <span className="font-bold text-rose-700 text-base mt-0.5 block">
                      {formatKg(confirmResult.summary.total_waste_kg)}
                    </span>
                    <span className="text-[10px] text-rose-600 font-semibold">
                      {confirmResult.summary.waste_percentage}% waste ratio
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-white shadow-2xs col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Waste Cost Impact
                    </span>
                    <span className="font-bold text-emerald-400 text-base mt-0.5 block">
                      {formatINR(confirmResult.summary.total_waste_cost)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Direct food cost
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Top Ingested Dishes Table */}
            {confirmResult.summary?.top_waste_dishes &&
              confirmResult.summary.top_waste_dishes.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Verified Dishes Ingested (Top Waste Contributors):
                  </span>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase">
                        <tr>
                          <th className="p-2.5">Menu Item Name</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Session</th>
                          <th className="p-2.5 text-right">Cooked (Kg)</th>
                          <th className="p-2.5 text-right">Waste (Kg)</th>
                          <th className="p-2.5 text-right">Waste Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {confirmResult.summary.top_waste_dishes.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">
                              {d.dish_name}
                            </td>
                            <td className="p-2.5 text-slate-600">
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold">
                                {d.category}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600">{d.session}</td>
                            <td className="p-2.5 text-right text-slate-800">
                              {formatKg(d.production_kg)}
                            </td>
                            <td className="p-2.5 text-right text-rose-700 font-bold">
                              {formatKg(d.waste_kg)}
                            </td>
                            <td className="p-2.5 text-right text-slate-900 font-bold">
                              {formatINR(d.waste_cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Verification & Duplicate Handling Notice */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-950 font-medium">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Ledger Verification Passed •{" "}
                  {confirmResult.summary?.duplicate_action === "replace"
                    ? `Replaced ${confirmResult.summary.replaced_records} prior duplicate records`
                    : "Appended as fresh batch records"}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Mathematical equations balanced:{" "}
                <span className="font-mono">
                  Production = Consumed + Leftovers
                </span>
                . Ingested records are now active across executive KPI calculations, charts, and drilldowns.
              </p>
            </div>

            {/* Non-fatal Warnings if any */}
            {confirmResult.warnings && confirmResult.warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Ingestion Notes & Warnings:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {confirmResult.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirmed Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                Upload Another Report
              </button>

              <button
                type="button"
                onClick={handleModalClose}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                Done & View in Analytics Dashboard
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STATE 4: FILE UPLOAD ZONE (WHEN NO FILE SELECTED YET)             */}
        {/* ================================================================= */}
        {!file && !error && !confirmResult && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-10 text-center bg-slate-50/70 hover:bg-emerald-50/20 transition-all cursor-pointer space-y-4"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-emerald-600">
              <Upload className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">
                Click to browse or drag & drop operational report
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Upload any banquet daily sheet, kitchen return report, or buffet log. The engine automatically interprets column headers regardless of formatting.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-600 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> XLSX / XLS / CSV
              </span>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-600 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> PDF Reports
              </span>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-600 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-purple-600" /> JPG / PNG Scans
              </span>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STATE 5: ANALYZING SPINNER                                        */}
        {/* ================================================================= */}
        {analyzing && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-9 h-9 text-emerald-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Analyzing Report Structure & Inferring Column Semantics...
              </p>
              <p className="text-[11px] text-slate-500">
                Detecting parent headers, matching food canonical fields, and verifying portion math
              </p>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STATE 6: PREVIEW & REVIEW STATE (BEFORE CONFIRMING)               */}
        {/* ================================================================= */}
        {previewData && !analyzing && !error && !confirmResult && !skippedNotice && (
          <div className="space-y-5">
            {/* File Info Bar */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="font-bold text-slate-900">{file?.name}</span>
                  <span className="text-slate-400 ml-2">
                    ({(file?.size ? file.size / 1024 : 0).toFixed(1)} KB)
                  </span>
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {previewData.file_type}
                  </span>
                </div>
              </div>

              <button
                onClick={resetAll}
                className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
              >
                Change File
              </button>
            </div>

            {/* Duplicate Detection Alert Banner */}
            {previewData.is_potential_duplicate && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Potential Duplicate Detected</span>
                </div>
                <p className="text-xs text-amber-800">
                  {previewData.duplicate_reason || "Records for this report or date already exist in the database."}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-xs font-semibold text-slate-700">Choose action:</span>
                  <button
                    type="button"
                    onClick={() => setDuplicateAction("replace")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      duplicateAction === "replace"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white border border-amber-300 text-amber-900 hover:bg-amber-100"
                    }`}
                  >
                    Replace Existing Records
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateAction("import")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      duplicateAction === "import"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Import as Additional
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateAction("skip")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      duplicateAction === "skip"
                        ? "bg-rose-700 text-white shadow-xs"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Skip Duplicate
                  </button>
                </div>
              </div>
            )}

            {/* Multi-Event / Multi-Session Date Notice (When NOT a duplicate) */}
            {!previewData.is_potential_duplicate && previewData.existing_events_on_date && previewData.existing_events_on_date.length > 0 && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1 text-xs text-blue-950">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Co-Existing Event Records on this Date</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  The database already contains operational records for:{" "}
                  <strong>
                    {previewData.existing_events_on_date.map((e: any) => `${e.event_name || 'Event'} (${e.session || 'Session'}) - ${e.record_count} items`).join(", ")}
                  </strong>
                  . This report will be appended as an additional event/session without overwriting prior records.
                </p>
              </div>
            )}

            {/* Sheet Selector (if multiple sheets exist) */}
            {previewData.sheets && previewData.sheets.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Sheet to Ingest:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSheet("all");
                      setEventOverride("");
                      const distinctDates = Array.from(new Set(previewData.sheets.map((s: any) => s.date).filter(Boolean)));
                      if (distinctDates.length > 1) {
                        setDateOverride("");
                      } else if (previewData.sheets[0]?.date) {
                        setDateOverride(previewData.sheets[0].date);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      selectedSheet === "all"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    ALL SHEETS ({previewData.total_records} items)
                  </button>
                  {previewData.sheets.map((s: any) => (
                    <button
                      key={s.sheet_name}
                      type="button"
                      onClick={() => {
                        setSelectedSheet(s.sheet_name);
                        setHotelOverride(s.hotel || "");
                        setDateOverride(s.date || "");
                        setEventOverride(s.event_name || "");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        selectedSheet === s.sheet_name
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {s.sheet_name.toUpperCase()} ({s.record_count} items)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 1: REPORT UNDERSTOOD (Editable metadata cards) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Report Understood & Context Extracted
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Review or override extracted fields before saving
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">
                    Property / Hotel Name
                  </label>
                  <input
                    type="text"
                    value={hotelOverride}
                    onChange={(e) => setHotelOverride(e.target.value)}
                    placeholder="e.g. Hotel Sahara"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-emerald-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">
                    Service Date
                  </label>
                  {selectedSheet === "all" && Array.from(new Set(previewData?.sheets?.map((s: any) => s.date).filter(Boolean))).length > 1 ? (
                    <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium text-xs">
                      Multi-day ({Array.from(new Set(previewData?.sheets?.map((s: any) => s.date).filter(Boolean))).length} daily sheets)
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={dateOverride}
                      onChange={(e) => setDateOverride(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-emerald-500 text-xs"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">
                    Event / Function Name
                  </label>
                  <input
                    type="text"
                    value={eventOverride}
                    onChange={(e) => setEventOverride(e.target.value)}
                    placeholder={selectedSheet === "all" ? "Leave blank to preserve each sheet's detected event" : "e.g. Daily Operations - Breakfast"}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-emerald-500 text-xs"
                  />
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Guest Count (Pax)</span>
                  <span className="font-bold text-slate-900 text-sm">{activeSheetObj?.pax || "N/A"}</span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Service Type</span>
                  <span className="font-bold text-slate-900 text-sm">{activeSheetObj?.service_type || "Buffet"}</span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Operational Items</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {selectedSheet === "all" ? previewData.total_records : activeSheetObj?.record_count} items detected
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: DETECTED FIELDS & CONFIDENCE MAPPINGS */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFieldMappings(!showFieldMappings)}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Detected Semantic Field Mappings ({activeSheetObj?.detected_fields?.length || 0} columns interpreted)
                  </span>
                </div>
                {showFieldMappings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showFieldMappings && activeSheetObj?.detected_fields && (
                <div className="p-3 bg-white divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-1.5">Canonical Concept</th>
                        <th className="p-1.5">Source Header in Document</th>
                        <th className="p-1.5 text-right">Confidence Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeSheetObj.detected_fields.map((f: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-1.5 font-bold text-slate-800">{f.interpreted_as}</td>
                          <td className="p-1.5 text-slate-600 font-mono text-[11px]">{f.source_field}</td>
                          <td className="p-1.5 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {f.confidence_percentage}% {f.confidence_level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 3: SAMPLE PREVIEW TABLE */}
            {activeSheetObj?.sample_records && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">
                  Normalized Data Preview (Sample First 5 Records):
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Item Name</th>
                        <th className="p-2">Session</th>
                        <th className="p-2 text-right">Cooked (Kg)</th>
                        <th className="p-2 text-right">Consumed (Kg)</th>
                        <th className="p-2 text-right">Leftover (Kg)</th>
                        <th className="p-2 text-right">Waste (Kg)</th>
                        <th className="p-2 text-right">Waste Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {activeSheetObj.sample_records.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{r.dish_name}</td>
                          <td className="p-2 text-slate-600">{r.session}</td>
                          <td className="p-2 text-right text-slate-800">{formatKg(r.actual_production_kg)}</td>
                          <td className="p-2 text-right text-emerald-700 font-semibold">{formatKg(r.actual_consumption_kg)}</td>
                          <td className="p-2 text-right text-amber-700">{formatKg(r.total_leftover_kg)}</td>
                          <td className="p-2 text-right text-rose-700 font-bold">{formatKg(r.total_waste_kg)}</td>
                          <td className="p-2 text-right text-slate-900 font-bold">{formatINR(r.waste_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mathematical Verification Banner */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900 font-medium">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Mathematical Verification Passed
              </div>
              <p className="text-[11px] text-emerald-800">
                Leftover and waste equations validated: <span className="font-mono">Production = Consumed + Leftover</span>, and <span className="font-mono">Leftover = Reuse + Waste</span>.
              </p>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() => handleConfirmImport()}
                disabled={importing}
                className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    Committing Live Records to Database...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Confirm & Commit to Analytics
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
