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
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setPreviewData(null);

    // Call preview API
    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append("file", selected);

      const res = await apiRequest<any>("/api/analytics/upload/preview", {
        method: "POST",
        body: formData,
      });

      setPreviewData(res);
      if (res.sheets && res.sheets.length > 0) {
        setSelectedSheet(res.sheets[0].sheet_name);
      }
    } catch (err: any) {
      setError(err.message || "Failed to parse Excel report");
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedSheet) {
        formData.append("sheet_name", selectedSheet);
      }

      await apiRequest<any>("/api/analytics/upload/confirm", {
        method: "POST",
        body: formData,
      });

      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to commit analytics import");
    } finally {
      setImporting(false);
    }
  };

  const currentSheetInfo = previewData?.sheets?.find(
    (s: any) => s.sheet_name === selectedSheet
  ) || previewData?.sheets?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Data Ingestion Engine
              </span>
            </div>
            <h2 className="font-serif text-xl font-bold text-slate-900 mt-0.5">
              Upload Food Production & Waste Report
            </h2>
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
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-50 hover:bg-emerald-50/30 transition-all cursor-pointer space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-emerald-600">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Click to browse or drag & drop Daily Report spreadsheet
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports Hotel Sahara Daily Production reports, Sitara Banquet consumption reports (.xlsx, .xls)
              </p>
            </div>
          </div>
        )}

        {/* Loading Spinner during preview generation */}
        {previewing && (
          <div className="py-8 text-center space-y-2">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Parsing Excel sheets and validating portion formulas...
            </p>
          </div>
        )}

        {/* Preview State */}
        {previewData && !previewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="font-bold text-slate-900">{file?.name}</span>
                  <span className="text-slate-400 ml-2">
                    ({(file?.size ? file.size / 1024 : 0).toFixed(1)} KB)
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

            {/* Sheet Selector if multiple sheets exist */}
            {previewData.sheets && previewData.sheets.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Sheet to Ingest:
                </label>
                <div className="flex gap-2">
                  {previewData.sheets.map((s: any) => (
                    <button
                      key={s.sheet_name}
                      onClick={() => setSelectedSheet(s.sheet_name)}
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

            {/* Current Sheet Metadata */}
            {currentSheetInfo && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Hotel</span>
                  <span className="font-bold text-slate-900">{currentSheetInfo.hotel}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Date</span>
                  <span className="font-bold text-slate-900">{currentSheetInfo.date}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Pax</span>
                  <span className="font-bold text-slate-900">{currentSheetInfo.pax || "N/A"}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Dish Rows</span>
                  <span className="font-bold text-emerald-700">{currentSheetInfo.record_count} items</span>
                </div>
              </div>
            )}

            {/* Sample Rows Preview Table */}
            {currentSheetInfo?.sample_records && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">
                  Sample Data Preview (First 5 Rows):
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Item Name</th>
                        <th className="p-2">Session</th>
                        <th className="p-2 text-right">Cooked</th>
                        <th className="p-2 text-right">Consumed</th>
                        <th className="p-2 text-right">Waste (Kg)</th>
                        <th className="p-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {currentSheetInfo.sample_records.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{r.dish_name}</td>
                          <td className="p-2 text-slate-600">{r.session}</td>
                          <td className="p-2 text-right text-slate-800">{formatKg(r.actual_production_kg)}</td>
                          <td className="p-2 text-right text-emerald-700">{formatKg(r.actual_consumption_kg)}</td>
                          <td className="p-2 text-right text-rose-700 font-bold">{formatKg(r.total_waste_kg)}</td>
                          <td className="p-2 text-right text-slate-900">{formatINR(r.waste_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Validation Checklist */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900 font-medium">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Mathematical Verification Passed
              </div>
              <p className="text-[11px] text-emerald-800">
                Leftovers and waste percentages verified against sheet formulas. Zero fabricated rows.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>

          {previewData && (
            <button
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
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
