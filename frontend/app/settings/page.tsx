"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { SettingsData, TrainingDataExportItem } from "@/types";
import {
  Sparkles,
  Download,
  CheckCircle2,
  Hotel,
  Save,
  Sliders,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form fields
  const [aiMode, setAiMode] = useState("mock");
  const [threshold, setThreshold] = useState("0.70");
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");

  const fetchSettings = () => {
    setLoading(true);
    apiRequest<SettingsData>("/api/settings")
      .then((data) => {
        setSettings(data);
        setAiMode(data.ai_mode);
        setThreshold(data.ai_confidence_threshold.toString());
        setHotelName(data.hotel_name);
        setHotelAddress(data.hotel_address);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await apiRequest("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          ai_mode: aiMode,
          ai_confidence_threshold: parseFloat(threshold),
          hotel_name: hotelName,
          hotel_address: hotelAddress,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchSettings();
    } catch (err: any) {
      alert(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleExportTrainingData = async () => {
    try {
      const data = await apiRequest<TrainingDataExportItem[]>("/api/scans/training-dataset");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `food_waste_training_dataset_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Failed to export training dataset");
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-slate-900 animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          System & Optical Parameters
        </h1>
        <p className="text-xs text-slate-500 font-normal mt-1">
          Computer vision inference model parameters, confidence thresholds, and verified audit dataset exports
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-[#064e3b] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          Settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* AI Inference Settings Card */}
        <div className="hotel-card p-6 sm:p-7 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#b48324] flex items-center justify-center border border-amber-200">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-slate-900">Vision Model Runtime</h3>
              <p className="text-xs text-slate-500 font-normal">Configure dish segmentation mode</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                Inference Engine Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAiMode("mock")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    aiMode === "mock"
                      ? "border-[#0f2942] bg-slate-50 ring-1 ring-[#0f2942]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900">Deterministic Engine (Demo)</div>
                  <div className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                    Reliable volume estimation without requiring dedicated server GPU resources.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAiMode("yolo")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    aiMode === "yolo"
                      ? "border-[#0f2942] bg-slate-50 ring-1 ring-[#0f2942]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900">YOLO26-seg (Neural Model)</div>
                  <div className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                    Runs PyTorch/Ultralytics segmentation checkpoint from model weights file.
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                Low Confidence Verification Alert ({Math.round(parseFloat(threshold) * 100)}%)
              </label>
              <input
                type="range"
                min="0.40"
                max="0.95"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full accent-[#0f2942] h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 font-normal mt-1">
                Scans scoring below this threshold prompt staff to verify food item identity or scale weight.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Model Identifier</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{settings.ai_model_name}</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Checkpoint Version</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{settings.ai_model_version}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hotel Profile Card */}
        <div className="hotel-card p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#0f2942] flex items-center justify-center border border-slate-200">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-slate-900">Hotel Profile</h3>
              <p className="text-xs text-slate-500 font-normal">Hotel identity printed on official audit reports</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Hotel Name
              </label>
              <input
                type="text"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Address & Banquet Location
              </label>
              <input
                type="text"
                value={hotelAddress}
                onChange={(e) => setHotelAddress(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="hotel-btn-gold text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </form>

      {/* Dataset Export Card */}
      <div className="hotel-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-base font-bold text-slate-900">Culinary Audit Training Dataset</h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Export verified scans with ground-truth food coordinates & staff overrides in JSON format.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportTrainingData}
            className="hotel-btn-primary text-xs shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export Dataset (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
