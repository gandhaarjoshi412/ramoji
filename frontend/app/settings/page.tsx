"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { SettingsData, TrainingDataExportItem } from "@/types";
import {
  Settings as SettingsIcon,
  Sparkles,
  Download,
  ShieldAlert,
  CheckCircle2,
  Hotel,
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="text-sm text-slate-500 font-medium">Loading system configurations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          System & AI Configuration
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Computer vision model settings, confidence thresholds, and training dataset exports
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* AI Inference Settings Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">AI Model & Inference Mode</h3>
              <p className="text-xs text-slate-500">Configure YOLO26-seg segmentation model runtime</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Inference Engine Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAiMode("mock")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    aiMode === "mock"
                      ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900">Mock AI Mode (Demo)</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Deterministic realistic detections without GPU or weights file.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAiMode("yolo")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    aiMode === "yolo"
                      ? "border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900">YOLO26-seg (Live Model)</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Loads custom weights from AI_MODEL_PATH.
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Low Confidence Warning Threshold ({Math.round(parseFloat(threshold) * 100)}%)
              </label>
              <input
                type="range"
                min="0.40"
                max="0.95"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full accent-emerald-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Scans below this score prompt staff to manually verify the detected dish.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Model Name</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{settings.ai_model_name}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Model Version</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{settings.ai_model_version}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hotel Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Hotel Profile</h3>
              <p className="text-xs text-slate-500">Banquet facility details printed on official reports</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Hotel Name
              </label>
              <input
                type="text"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={hotelAddress}
                onChange={(e) => setHotelAddress(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </form>

      {/* Model Continuous Learning & Dataset Export (Section 42) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Model Training Dataset Export</h3>
            <p className="text-xs text-slate-500">
              Download real verified hotel food images and staff corrections for future YOLO26-seg fine-tuning.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportTrainingData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Dataset (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
