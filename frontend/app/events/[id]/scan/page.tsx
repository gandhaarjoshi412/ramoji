"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiRequest, formatINR } from "@/lib/api";
import { EventDetail, WasteScan, FoodItem } from "@/types";
import {
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Edit3,
  RotateCcw,
  ArrowLeft,
  DollarSign,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";

export default function WasteScannerPage() {
  const params = useParams();
  const eventId = Number(params?.id);
  const router = useRouter();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [catalog, setCatalog] = useState<FoodItem[]>([]);
  const [loadingEvent, setLoadingEvent] = useState(true);

  // Camera & Image state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImageBlob, setCapturedImageBlob] = useState<Blob | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Pipeline stages: "idle" | "uploading" | "analyzing" | "result" | "confirmed" | "error"
  const [stage, setStage] = useState<string>("idle");
  const [stageMessage, setStageMessage] = useState<string>("");
  const [scanResult, setScanResult] = useState<WasteScan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Correction mode state
  const [isEditing, setIsEditing] = useState(false);
  const [correctedFoodId, setCorrectedFoodId] = useState<number | "">("");
  const [correctedWeight, setCorrectedWeight] = useState<string>("");
  const [correctionNotes, setCorrectionNotes] = useState<string>("");

  useEffect(() => {
    if (eventId) {
      Promise.all([
        apiRequest<EventDetail>(`/api/events/${eventId}`),
        apiRequest<FoodItem[]>("/api/foods"),
      ])
        .then(([evData, foodsData]) => {
          setEvent(evData);
          setCatalog(foodsData);
        })
        .catch((err) => setErrorMessage(err.message || "Failed to load event"))
        .finally(() => setLoadingEvent(false));
    }
  }, [eventId]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      // If camera access is denied, trigger file input directly
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCapturedImageBlob(blob);
            setImagePreviewUrl(URL.createObjectURL(blob));
            stopCamera();
            runScanPipeline(blob, "camera_capture.jpg");
          }
        },
        "image/jpeg",
        0.9
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedImageBlob(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      stopCamera();
      runScanPipeline(file, file.name);
    }
  };

  // Run the 4-stage AI pipeline
  const runScanPipeline = async (blob: Blob, filename: string) => {
    setStage("uploading");
    setStageMessage("Uploading photograph to banquet dispatch storage...");
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", blob, filename);

    try {
      setTimeout(() => {
        setStage("analyzing");
        setStageMessage("AI inference running: YOLO26-seg segmentation & food detection...");
      }, 500);

      const res = await apiRequest<WasteScan>(`/api/events/${eventId}/scan`, {
        method: "POST",
        body: formData,
        headers: {}, // Let browser set multipart boundary
      });

      setScanResult(res);
      setCorrectedWeight(res.estimated_weight_grams.toString());
      setCorrectedFoodId(res.food_item_id || "");
      setStage("result");
    } catch (err: any) {
      setStage("error");
      setErrorMessage(err.message || "Failed to process food waste scan.");
    }
  };

  const handleConfirm = async () => {
    if (!scanResult) return;
    try {
      await apiRequest(`/api/scans/${scanResult.id}/verify`, {
        method: "PUT",
        body: JSON.stringify({
          notes: "Confirmed by banquet staff without corrections.",
        }),
      });
      setStage("confirmed");
    } catch (err: any) {
      alert(err.message || "Failed to confirm scan.");
    }
  };

  const handleSaveCorrection = async () => {
    if (!scanResult) return;
    const weightNum = parseFloat(correctedWeight);
    if (!weightNum || weightNum <= 0) {
      alert("Please enter a valid weight in grams.");
      return;
    }

    try {
      const updated = await apiRequest<WasteScan>(`/api/scans/${scanResult.id}/verify`, {
        method: "PUT",
        body: JSON.stringify({
          food_item_id: correctedFoodId ? Number(correctedFoodId) : undefined,
          human_weight_correction: weightNum,
          notes: correctionNotes.trim() || undefined,
        }),
      });
      setScanResult(updated);
      setIsEditing(false);
      setStage("confirmed");
    } catch (err: any) {
      alert(err.message || "Failed to save correction.");
    }
  };

  const handleReset = () => {
    setImagePreviewUrl(null);
    setCapturedImageBlob(null);
    setScanResult(null);
    setIsEditing(false);
    setStage("idle");
    setErrorMessage(null);
  };

  if (loadingEvent) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="text-sm text-slate-500 font-medium">Initializing waste scanner...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}`}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              AI Waste Scanner
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Event: <strong className="text-slate-800">{event?.name}</strong> • Camera Quantity & Recipe Cost Engine
            </p>
          </div>
        </div>

        <Link
          href={`/events/${eventId}/analytics`}
          className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
        >
          View Analytics
        </Link>
      </div>

      {/* Camera / Upload Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden relative">
        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden File Input Fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Live Camera View */}
        {isCameraActive && (
          <div className="relative bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            
            {/* Guide overlay */}
            <div className="absolute inset-8 border-2 border-dashed border-white/60 rounded-2xl pointer-events-none flex items-center justify-center">
              <span className="text-white/80 text-xs font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                Position food dish inside frame
              </span>
            </div>

            {/* Shutter Button */}
            <div className="absolute bottom-6 inset-x-0 flex justify-center items-center gap-6">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-xs hover:bg-black/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full border-4 border-white bg-emerald-500 hover:bg-emerald-600 shadow-xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
              >
                <Camera className="w-7 h-7 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Captured Image Preview with Bounding Box Overlay */}
        {!isCameraActive && imagePreviewUrl && (
          <div className="relative aspect-4/3 bg-slate-900 flex items-center justify-center overflow-hidden">
            <img
              src={imagePreviewUrl}
              alt="Scanned Leftover Food"
              className="w-full h-full object-contain"
            />

            {/* AI Bounding Box & Segmentation Indicator */}
            {stage === "result" && scanResult?.bounding_box && (
              <div className="absolute inset-0 pointer-events-none border-4 border-emerald-500/80 rounded-lg m-6 flex items-start justify-start p-2">
                <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded shadow">
                  {scanResult.ai_food_prediction} ({Math.round(scanResult.ai_confidence * 100)}%)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Initial Idle Screen */}
        {stage === "idle" && !isCameraActive && !imagePreviewUrl && (
          <div className="p-8 sm:p-12 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
              <Camera className="w-10 h-10" />
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="text-lg font-black text-slate-900">Photograph Leftover Food</h3>
              <p className="text-xs text-slate-500 font-medium">
                Point camera at leftover pan, chafing dish, or buffet platter. AI will detect the food, estimate volume, and calculate production cost loss.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
              <button
                type="button"
                onClick={startCamera}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Open Live Camera
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                Upload from Gallery
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 max-w-sm mx-auto flex items-start gap-2 text-left text-[11px] text-slate-500">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Camera-only approximation. Results are clearly marked as <strong>estimates</strong> based on physical density and recipe costs.
              </span>
            </div>
          </div>
        )}

        {/* Processing Pipeline Animation */}
        {(stage === "uploading" || stage === "analyzing") && (
          <div className="p-8 text-center space-y-4 bg-white">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center animate-pulse">
              <Sparkles className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">Analyzing Food Waste</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">{stageMessage}</p>
            </div>
            <div className="w-48 h-1.5 mx-auto bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full animate-indeterminate" />
            </div>
          </div>
        )}

        {/* Error State */}
        {stage === "error" && (
          <div className="p-6 bg-red-50 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
            <h4 className="text-sm font-bold text-red-900">Scan Analysis Error</h4>
            <p className="text-xs text-red-700">{errorMessage}</p>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success / Result Stage */}
        {stage === "result" && scanResult && !isEditing && (
          <div className="p-6 sm:p-8 space-y-6 bg-white border-t border-slate-100">
            {/* Low confidence warning banner */}
            {scanResult.is_low_confidence && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Low confidence detection ({Math.round(scanResult.ai_confidence * 100)}%).</strong>
                  <p className="font-normal mt-0.5">Please verify the detected food item using the "Correct" button.</p>
                </div>
              </div>
            )}

            {/* Detection Summary Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Detected Food Item
                </span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {scanResult.final_food_name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  AI Confidence
                </span>
                <span className={`text-base font-black px-2.5 py-0.5 rounded-full ${
                  scanResult.ai_confidence >= 0.85 
                    ? "bg-emerald-100 text-emerald-800" 
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {Math.round(scanResult.ai_confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Core Calculations Grid */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Estimated Quantity
                </span>
                <span className="text-lg font-black text-slate-900 block mt-0.5">
                  {scanResult.final_weight_grams} <span className="text-xs font-bold text-slate-500">g</span>
                </span>
                <span className="text-[10px] text-slate-400 block">
                  ({(scanResult.final_weight_grams / 1000).toFixed(2)} kg)
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Recipe Cost / g
                </span>
                <span className="text-lg font-black text-slate-900 block mt-0.5">
                  ₹{scanResult.cost_per_gram.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-400 block">From ingredients</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-red-700 block">
                  Estimated Waste Cost
                </span>
                <span className="text-xl font-black text-red-600 block mt-0.5">
                  {formatINR(scanResult.final_waste_cost)}
                </span>
                <span className="text-[10px] text-slate-400 block">Monetary loss</span>
              </div>
            </div>

            {/* Model & Source Meta */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
              <span>Model: <strong className="text-slate-600">{scanResult.ai_model_name}</strong> ({scanResult.ai_model_version})</span>
              <span>Method: <strong className="text-slate-600">{scanResult.measurement_method}</strong></span>
            </div>

            {/* Action Buttons: Confirm, Correct, Retake */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retake
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  Correct
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirm Waste Record
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff Correction Sub-form */}
        {stage === "result" && scanResult && isEditing && (
          <div className="p-6 sm:p-8 space-y-5 bg-white border-t border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-900">Correct AI Detection & Quantity</h4>
              <span className="text-xs text-slate-400">Stores both AI and human edits for model training</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Select Correct Food (Event Menu)
              </label>
              <select
                value={correctedFoodId}
                onChange={(e) => setCorrectedFoodId(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choose Food from Hotel Catalog --</option>
                {catalog.map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.name} ({food.category}) — ₹{food.cost_per_gram}/g
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Estimated Weight (Grams)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="10"
                  min="10"
                  value={correctedWeight}
                  onChange={(e) => setCorrectedWeight(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-slate-900 text-base font-bold focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3.5 top-2.5 text-slate-400 font-bold text-sm">g</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">AI initially predicted {scanResult.estimated_weight_grams} g</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Correction Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Mixed paneer with rice, adjusted depth"
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md"
              >
                Save Correction
              </button>
            </div>
          </div>
        )}

        {/* Confirmed State */}
        {stage === "confirmed" && (
          <div className="p-8 text-center space-y-4 bg-emerald-50/50">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Waste Record Saved!</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Event analytics and dashboard have been updated in real-time.
              </p>
            </div>

            <div className="flex justify-center items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Scan Another Dish
              </button>

              <Link
                href={`/events/${eventId}/analytics`}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs flex items-center gap-1.5"
              >
                <span>View Event Analytics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
