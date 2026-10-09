"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiRequest, formatINR, formatKg } from "@/lib/api";
import {
  Trash2,
  Calendar,
  CalendarX,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Building2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

interface DateSummaryItem {
  date: string;
  hotel: string;
  record_count: number;
  total_production_kg: number;
  total_waste_kg: number;
  total_waste_cost: number;
}

interface DeleteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess: (info: { date?: string; count: number; message: string }) => void;
  hotels: string[];
  currentDate?: string;
}

export const DeleteDataModal: React.FC<DeleteDataModalProps> = ({
  isOpen,
  onClose,
  onDeleteSuccess,
  hotels = [],
  currentDate,
}) => {
  const [tab, setTab] = useState<"active" | "custom">("active");
  const [availableDates, setAvailableDates] = useState<DateSummaryItem[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Custom date selection state
  const [customDate, setCustomDate] = useState<string>(currentDate || "");
  const [customHotel, setCustomHotel] = useState<string>("all");
  const [isRange, setIsRange] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pending delete confirmation target
  const [pendingTarget, setPendingTarget] = useState<{
    dateStr?: string;
    startDate?: string;
    endDate?: string;
    hotel?: string;
    count?: number;
    label: string;
  } | null>(null);

  const fetchDatesSummary = useCallback(async () => {
    setLoadingDates(true);
    setError(null);
    try {
      const res = await apiRequest<DateSummaryItem[]>("/api/analytics/dates-summary");
      setAvailableDates(res || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load summary of available dates");
    } finally {
      setLoadingDates(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      setPendingTarget(null);
      fetchDatesSummary();
      if (currentDate && currentDate !== "all") {
        setCustomDate(currentDate);
      }
    }
  }, [isOpen, currentDate, fetchDatesSummary]);

  if (!isOpen) return null;

  const handleExecuteDelete = async () => {
    if (!pendingTarget) return;
    setDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const query = new URLSearchParams();
      if (pendingTarget.dateStr) query.set("date_str", pendingTarget.dateStr);
      if (pendingTarget.startDate) query.set("start_date", pendingTarget.startDate);
      if (pendingTarget.endDate) query.set("end_date", pendingTarget.endDate);
      if (pendingTarget.hotel && pendingTarget.hotel !== "all") query.set("hotel", pendingTarget.hotel);

      const res = await apiRequest<{
        status: string;
        deleted_records: number;
        message: string;
      }>(`/api/analytics/records?${query.toString()}`, {
        method: "DELETE",
      });

      const count = res?.deleted_records || 0;
      const msg = res?.message || `Successfully deleted ${count} records.`;
      setSuccessMessage(msg);
      setPendingTarget(null);

      // Refresh list of dates
      await fetchDatesSummary();

      // Notify parent to refresh analytics
      onDeleteSuccess({
        date: pendingTarget.dateStr || pendingTarget.startDate,
        count,
        message: msg,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to delete records for the specified date");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                  Data Governance & Maintenance
                </span>
              </div>
              <h2 className="font-serif text-lg font-bold text-slate-900 mt-0.5">
                Delete Data for Specific Days
              </h2>
              <p className="text-xs text-slate-500">
                Permanently purge food waste and production records for selected service dates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}

        {/* Double Confirmation Guard Banner */}
        {pendingTarget && (
          <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                  Confirm Permanent Deletion
                </h4>
                <p className="text-xs text-rose-800 mt-0.5">
                  Are you sure you want to delete all records for{" "}
                  <strong>{pendingTarget.label}</strong>
                  {pendingTarget.count !== undefined ? ` (${pendingTarget.count} records)` : ""}?
                  This will remove all associated food production, consumption, and waste records from the database ledger. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingTarget(null)}
                disabled={deleting}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting Records...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Yes, Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === "active"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Active Days in Database ({availableDates.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("custom")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === "custom"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CalendarX className="w-3.5 h-3.5" />
            Custom Date Picker
          </button>

          <button
            type="button"
            onClick={fetchDatesSummary}
            title="Refresh dates list"
            className="ml-auto p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDates ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* TAB 1: ACTIVE DATES LIST */}
        {tab === "active" && (
          <div className="space-y-3">
            {loadingDates ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                Loading days with recorded data...
              </div>
            ) : availableDates.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-1">
                <p className="text-xs font-bold text-slate-700">No data records found in database</p>
                <p className="text-[11px] text-slate-400">Upload an Excel report to populate records</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {availableDates.map((item, idx) => (
                  <div
                    key={`${item.date}-${item.hotel}-${idx}`}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.date}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-700 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          {item.hotel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>
                          <strong className="text-slate-800">{item.record_count}</strong> items
                        </span>
                        <span>•</span>
                        <span>
                          Cooked: <strong className="text-slate-800">{formatKg(item.total_production_kg)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Waste: <strong className="text-rose-700">{formatKg(item.total_waste_kg)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Cost: <strong className="text-slate-900">{formatINR(item.total_waste_cost)}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPendingTarget({
                          dateStr: item.date,
                          hotel: item.hotel,
                          count: item.record_count,
                          label: `${item.date} (${item.hotel})`,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Day
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CUSTOM DATE PICKER */}
        {tab === "custom" && (
          <div className="space-y-4 text-xs">
            {/* Range vs Single Date Toggle */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isRange}
                  onChange={(e) => setIsRange(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                Delete date range (multiple days)
              </label>
            </div>

            {!isRange ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase block">
                  Select Specific Date to Delete
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-emerald-500 text-xs"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase block">
                    From Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-emerald-500 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase block">
                    To End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-emerald-500 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Hotel Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase block">
                Target Hotel / Venue (Optional)
              </label>
              <select
                value={customHotel}
                onChange={(e) => setCustomHotel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-emerald-500 text-xs"
              >
                <option value="all">All Hotels / Locations</option>
                {hotels.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!isRange && !customDate) {
                    setError("Please select a valid date first.");
                    return;
                  }
                  if (isRange && (!startDate || !endDate)) {
                    setError("Please specify both start date and end date.");
                    return;
                  }
                  setPendingTarget({
                    dateStr: !isRange ? customDate : undefined,
                    startDate: isRange ? startDate : undefined,
                    endDate: isRange ? endDate : undefined,
                    hotel: customHotel,
                    label: !isRange
                      ? `${customDate}${customHotel !== "all" ? ` (${customHotel})` : ""}`
                      : `${startDate} to ${endDate}${customHotel !== "all" ? ` (${customHotel})` : ""}`,
                  });
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Review & Delete for Selected Date
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
