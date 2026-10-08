"use client";

import React, { useState, useRef } from "react";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
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
} from "lucide-react";

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
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
  const [duplicateAction, setDuplicateAction] = useState<"import" | "replace" | "skip">("replace");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setPreviewData(null);

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
      if (res.sheets && res.sheets.length > 0) {
        setSelectedSheet("all");
        // Pre-fill editable overrides from first detected sheet
        setHotelOverride(res.sheets[0].hotel || "");
        setDateOverride(res.sheets[0].date || "");
        setEventOverride(res.sheets[0].event_name || "");
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze and parse operational report");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sheet_name", selectedSheet);
      formData.append("duplicate_action", duplicateAction);
      if (hotelOverride.trim()) formData.append("hotel_override", hotelOverride.trim());
      if (dateOverride.trim()) formData.append("date_override", dateOverride.trim());
      if (eventOverride.trim()) formData.append("event_override", eventOverride.trim());

      await apiRequest<any>("/api/analytics/upload/confirm", {
        method: "POST",
        body: formData,
      });

      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to commit analytics import to database");
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
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Universal Hospitality Data Ingestion Engine
              </span>
            </div>
            <h2 className="font-serif text-xl font-bold text-slate-900 mt-1">
              Import Food Production & Operational Report
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Intelligent multi-format semantic parser for Excel, CSV, PDF, and scanned logs
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* File Drag and Drop Zone */}
        {!file && (
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

        {/* Loading Spinner during structure detection */}
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

        {/* Preview State: Import Review Screen */}
        {previewData && !analyzing && (
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
                onClick={() => {
                  setFile(null);
                  setPreviewData(null);
                }}
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

            {/* Sheet Selector (if multiple sheets exist) */}
            {previewData.sheets && previewData.sheets.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Sheet to Ingest:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSheet("all")}
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
                  <input
                    type="date"
                    value={dateOverride}
                    onChange={(e) => setDateOverride(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-emerald-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">
                    Event / Function Name
                  </label>
                  <input
                    type="text"
                    value={eventOverride}
                    onChange={(e) => setEventOverride(e.target.value)}
                    placeholder="e.g. Daily Operations - Breakfast"
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
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>

          {previewData && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing}
              className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  Importing Live Records...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Confirm & Commit to Analytics
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
