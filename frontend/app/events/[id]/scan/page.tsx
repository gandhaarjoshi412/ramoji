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
  ChevronRight,
  Info,
  ScanLine,
  Zap,
  Save,
  Check,
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

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedImageBlob(blob);
        const previewUrl = URL.createObjectURL(blob);
        setImagePreviewUrl(previewUrl);
        stopCamera();
        processScan(blob);
      }
    }, "image/jpeg", 0.9);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCapturedImageBlob(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    processScan(file);
  };

  const processScan = async (fileBlob: Blob) => {
    setStage("uploading");
    setStageMessage("Transmitting high-resolution dish image...");
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", fileBlob, "dish_scan.jpg");

    try {
      setStage("analyzing");
      setStageMessage("AI volume segmentation & ingredient costing...");

      const scan = await apiRequest<WasteScan>(`/api/events/${eventId}/scan`, {
        method: "POST",
        body: formData,
      });

      setScanResult(scan);
      setCorrectedFoodId(scan.final_food_id || scan.food_item_id || "");
      const initialWeight = scan.final_weight_kg || scan.estimated_weight_kg || 
        (scan.final_weight_grams ? scan.final_weight_grams / 1000 : (scan.estimated_weight_grams ? scan.estimated_weight_grams / 1000 : 0));
      setCorrectedWeight(String(initialWeight));
      setCorrectionNotes(scan.correction_notes || scan.notes || "");
      setStage("result");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process scan inference.");
      setStage("error");
    }
  };

  const handleSaveCorrection = async () => {
    if (!scanResult) return;

    try {
      const updatedScan = await apiRequest<WasteScan>(
        `/api/events/${eventId}/scans/${scanResult.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            final_food_id: correctedFoodId ? Number(correctedFoodId) : undefined,
            final_weight_kg: correctedWeight ? parseFloat(correctedWeight) : undefined,
            correction_notes: correctionNotes || undefined,
          }),
        }
      );

      setScanResult(updatedScan);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || "Failed to update scan audit.");
    }
  };

  const handleConfirmScan = () => {
    setStage("confirmed");
    setTimeout(() => {
      router.push(`/events/${eventId}`);
    }, 1500);
  };

  const handleReset = () => {
    setStage("idle");
    setScanResult(null);
    setCapturedImageBlob(null);
    setImagePreviewUrl(null);
    setIsEditing(false);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Hidden File Input & Canvas */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}`}
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Camera Food Waste Scan
            </h1>
            <p className="text-xs text-slate-500 font-normal">
              {event?.name ? `Audit scan for: ${event.name}` : "Optical volumetric food waste analysis"}
            </p>
          </div>
        </div>

        {stage !== "idle" && (
          <button
            onClick={handleReset}
            className="hotel-btn-secondary text-xs py-1.5 px-3"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Scan
          </button>
        )}
      </div>

      {/* Main Scanner Container */}
      <div className="hotel-card overflow-hidden">
        {/* Live Camera View */}
        {isCameraActive && (
          <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Reticle with Warm Bronze Corners */}
            <div className="absolute inset-8 pointer-events-none border-2 border-white/20 rounded-xl flex items-center justify-center">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#b48324] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#b48324] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#b48324] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#b48324] rounded-br-lg" />
              <span className="text-[11px] font-bold text-[#f4d89a] uppercase tracking-widest bg-black/60 px-3 py-1 rounded-md backdrop-blur-md">
                Align Chafing Dish or Platter
              </span>
            </div>

            {/* Camera Controls */}
            <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={stopCamera}
                className="hotel-btn-secondary text-xs bg-black/70 text-white border-white/20 hover:bg-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full border-4 border-white bg-[#b48324] hover:bg-[#966814] shadow-xl flex items-center justify-center transition-all cursor-pointer transform active:scale-95"
              >
                <Camera className="w-7 h-7 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Captured Image Preview with Bounding Box & Scanning Laser */}
        {!isCameraActive && imagePreviewUrl && (
          <div className="relative aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden">
            <img
              src={imagePreviewUrl}
              alt="Scanned Food Leftover"
              className="w-full h-full object-contain"
            />

            {/* Laser Scanning Animation */}
            {(stage === "uploading" || stage === "analyzing") && (
              <div className="scanner-laser" />
            )}

            {/* AI Bounding Box Overlay */}
            {stage === "result" && scanResult?.bounding_box && (
              <div className="absolute inset-0 pointer-events-none border-3 border-[#b48324] rounded-xl m-6 flex items-start justify-start p-3 shadow-2xl">
                <span className="bg-[#0f2942] text-[#f4d89a] text-[11px] font-bold px-3 py-1 rounded-md border border-[#b48324] flex items-center gap-1.5 shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-[#b48324]" />
                  {scanResult.ai_food_prediction} ({Math.round(scanResult.ai_confidence * 100)}%)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Initial Idle Screen */}
        {stage === "idle" && !isCameraActive && !imagePreviewUrl && (
          <div className="p-8 sm:p-12 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 text-[#0f2942] flex items-center justify-center border border-slate-200 shadow-xs">
              <Camera className="w-8 h-8 text-[#0f2942]" />
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="font-serif text-xl font-bold text-slate-900 tracking-tight">
                Photograph Leftover Banquet Dish
              </h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                Position camera over chafing tray or serving bowl. AI segments food items, computes estimated weight from volume density, and determines raw production cost loss.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
              <button
                type="button"
                onClick={startCamera}
                className="hotel-btn-gold w-full sm:w-auto text-xs py-3 px-6"
              >
                <Camera className="w-4 h-4" />
                Open Live Camera
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="hotel-btn-secondary w-full sm:w-auto text-xs py-3 px-6"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                Upload Dish Photo
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto flex items-start gap-2.5 text-left text-xs text-slate-600 font-normal">
              <Info className="w-4 h-4 text-[#b48324] shrink-0 mt-0.5" />
              <span>
                Derived quantities are labeled as <strong>Estimated Waste Cost</strong> in compliance with hospitality kitchen auditing standards.
              </span>
            </div>
          </div>
        )}

        {/* Processing Animation */}
        {(stage === "uploading" || stage === "analyzing") && (
          <div className="p-8 text-center space-y-4 bg-slate-900 text-white">
            <div className="w-14 h-14 mx-auto rounded-xl bg-[#b48324]/20 text-[#f4d89a] flex items-center justify-center border border-[#b48324]/30">
              <Zap className="w-7 h-7 animate-pulse text-[#e5b958]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Running Vision Inference</h4>
              <p className="text-xs text-[#f4d89a] font-medium">{stageMessage}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {stage === "error" && (
          <div className="p-8 bg-rose-50 border-t border-rose-200 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
            <div>
              <h4 className="text-base font-bold text-rose-900">Scan Analysis Failed</h4>
              <p className="text-xs text-rose-700 mt-1">{errorMessage}</p>
            </div>
            <button
              onClick={handleReset}
              className="hotel-btn-primary bg-rose-600 hover:bg-rose-700 border-rose-600 text-xs"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success / Result Stage */}
        {stage === "result" && scanResult && !isEditing && (
          <div className="p-6 sm:p-8 space-y-6 bg-white border-t border-slate-200">
            {/* Low confidence warning banner */}
            {scanResult.is_low_confidence && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#b48324] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-950 font-bold">Low Confidence Prediction ({Math.round(scanResult.ai_confidence * 100)}%)</strong>
                  <p className="font-normal mt-0.5 text-amber-800">
                    The optical confidence is below target. Click &quot;Correct Audit&quot; below to adjust food item or weight.
                  </p>
                </div>
              </div>
            )}

            {/* Detection Summary Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Identified Food Dish
                </span>
                <span className="font-serif text-2xl font-bold text-slate-900">
                  {scanResult.final_food_name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  AI Optical Confidence
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-md inline-block mt-0.5 border ${
                  scanResult.ai_confidence >= 0.85 
                    ? "bg-emerald-50 text-[#064e3b] border-emerald-200" 
                    : "bg-amber-50 text-[#b48324] border-amber-200"
                }`}>
                  {Math.round(scanResult.ai_confidence * 100)}% Match
                </span>
              </div>
            </div>

            {/* Metric Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Measured Waste Weight
                </span>
                <span className="text-xl font-bold text-rose-600">
                  {scanResult.final_weight_kg ?? scanResult.estimated_weight_kg ?? ((scanResult.final_weight_grams || scanResult.estimated_weight_grams || 0) / 1000).toFixed(2)} kg
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Est. Waste Cost Loss
                </span>
                <span className="text-xl font-bold text-slate-900">
                  {formatINR(scanResult.estimated_cost ?? scanResult.final_waste_cost ?? scanResult.estimated_waste_cost ?? 0)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Food Density
                </span>
                <span className="text-xl font-bold text-slate-700">
                  {scanResult.density_factor ?? 0.85} kg/L
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Audit Status
                </span>
                <span className="text-xs font-bold text-[#064e3b] flex items-center gap-1 mt-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {scanResult.human_verified ? "Staff Verified" : "Optical Estimated"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="hotel-btn-secondary text-xs"
              >
                <Edit3 className="w-4 h-4" />
                Correct Food / Weight
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="hotel-btn-secondary text-xs"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleConfirmScan}
                  className="hotel-btn-gold text-xs"
                >
                  <Check className="w-4 h-4" />
                  Confirm & Commit to Banquet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit / Correction View */}
        {stage === "result" && scanResult && isEditing && (
          <div className="p-6 sm:p-8 space-y-5 bg-white border-t border-slate-200">
            <h3 className="font-serif text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Manual Staff Audit Override
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Correct Food Item
                </label>
                <select
                  value={correctedFoodId}
                  onChange={(e) => setCorrectedFoodId(Number(e.target.value))}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 cursor-pointer"
                >
                  {catalog.map((food) => (
                    <option key={food.id} value={food.id}>
                      {food.name} ({food.category}) — ₹{food.cost_per_kg || food.default_cost_per_kg}/kg
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Corrected Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={correctedWeight}
                  onChange={(e) => setCorrectedWeight(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Staff Audit Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Scaled on kitchen tare scale; AI confused curry sauce with gravy."
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="hotel-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                className="hotel-btn-primary text-xs"
              >
                <Save className="w-4 h-4" />
                Save Audit Correction
              </button>
            </div>
          </div>
        )}

        {/* Confirmed Animation Screen */}
        {stage === "confirmed" && (
          <div className="p-12 text-center space-y-4 bg-emerald-50 text-emerald-950">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#064e3b] text-white flex items-center justify-center shadow-lg">
              <Check className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-xl font-bold text-[#064e3b]">
                Scan Logged Successfully
              </h3>
              <p className="text-xs text-emerald-700 font-medium">
                Dish leftover volume and cost loss committed to banquet event records.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
