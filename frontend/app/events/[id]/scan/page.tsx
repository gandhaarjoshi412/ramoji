"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
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
  ChevronRight,
  Info,
  Zap,
  Save,
  Check,
  SwitchCamera,
  Layers,
  Image as ImageIcon,
  ScanLine,
  Eye,
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
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [capturedImageBlob, setCapturedImageBlob] = useState<Blob | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"annotated" | "original">("annotated");

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

  const startCamera = async (facing: "environment" | "user" = cameraFacingMode) => {
    setCameraError(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
        setCameraFacingMode(facing);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please enable camera access in your browser settings or use the file upload option."
          : "Could not initialize camera device. Please attach a camera or use high-resolution file upload."
      );
      setIsCameraActive(false);
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === "environment" ? "user" : "environment";
    startCamera(nextFacing);
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

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedImageBlob(blob);
          const previewUrl = URL.createObjectURL(blob);
          setImagePreviewUrl(previewUrl);
          stopCamera();
          processScan(blob);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCapturedImageBlob(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    processScan(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCapturedImageBlob(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
      processScan(file);
    }
  };

  const processScan = async (fileBlob: Blob) => {
    setStage("uploading");
    setStageMessage("Transmitting high-resolution dish capture...");
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", fileBlob, "dish_scan.jpg");

    try {
      setStage("analyzing");
      setStageMessage("Segmenting dish contours & running YOLO classification...");

      const scan = await apiRequest<WasteScan>(`/api/events/${eventId}/scan`, {
        method: "POST",
        body: formData,
      });

      setScanResult(scan);
      setViewMode("annotated");
      setCorrectedFoodId(scan.final_food_id || scan.food_item_id || "");
      const initialWeight =
        scan.final_weight_kg ||
        scan.estimated_weight_kg ||
        (scan.final_weight_grams
          ? scan.final_weight_grams / 1000
          : scan.estimated_weight_grams
          ? scan.estimated_weight_grams / 1000
          : 0);
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
    }, 1200);
  };

  const handleReset = () => {
    stopCamera();
    setStage("idle");
    setScanResult(null);
    setCapturedImageBlob(null);
    setImagePreviewUrl(null);
    setViewMode("annotated");
    setIsEditing(false);
    setErrorMessage(null);
    setCameraError(null);
  };

  const getFullImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("blob:") ||
      url.startsWith("data:")
    ) {
      return url;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${apiUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const matchedFoodItem = catalog.find(
    (f) =>
      f.id === scanResult?.food_item_id ||
      f.id === scanResult?.final_food_id ||
      f.name.toLowerCase() === scanResult?.final_food_name?.toLowerCase() ||
      f.name.toLowerCase() === scanResult?.ai_food_prediction?.toLowerCase()
  );

  const displayedImageUrl =
    stage === "result" && scanResult?.annotated_image_url && viewMode === "annotated"
      ? getFullImageUrl(scanResult.annotated_image_url)
      : scanResult?.image_url
      ? getFullImageUrl(scanResult.image_url)
      : imagePreviewUrl;

  const confidencePercent = scanResult ? Math.round(scanResult.ai_confidence * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Hidden File Input & Canvas */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Modern Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3.5">
          <Link
            href={`/events/${eventId}`}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all shadow-2xs active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                AI Optical Waste Scanner
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Vision
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {event?.name ? `Banquet Audit: ${event.name}` : "Volumetric leftover estimation & yield logging"}
            </p>
          </div>
        </div>

        {stage !== "idle" && (
          <button
            onClick={handleReset}
            className="hotel-btn-secondary text-xs self-start sm:self-auto active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            New Scan
          </button>
        )}
      </div>

      {/* Camera Access Error Alert */}
      {cameraError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-medium flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{cameraError}</p>
          </div>
          <button
            onClick={() => setCameraError(null)}
            className="text-amber-700 hover:text-amber-900 text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Scanner Terminal Card */}
      <div className="hotel-card overflow-hidden bg-white border border-slate-200/80 shadow-card">
        {/* Live Camera Viewport */}
        {isCameraActive && (
          <div className="relative aspect-4/3 sm:aspect-16/9 bg-slate-950 flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />

            {/* High-Tech Optical Viewfinder Reticle */}
            <div className="absolute inset-8 sm:inset-12 pointer-events-none border border-white/15 rounded-2xl flex items-center justify-center">
              {/* Minimal modern corner brackets */}
              <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-emerald-400 rounded-br-lg shadow-[0_0_8px_rgba(52,211,153,0.5)]" />

              {/* Center reticle badge */}
              <div className="text-center">
                <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-widest bg-slate-900/80 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                  Frame Chafing Dish or Platter
                </span>
              </div>
            </div>

            {/* Top Bar Controls */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
              <span className="text-xs font-bold text-white bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 flex items-center gap-2 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Optical Camera Live
              </span>

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md text-white border border-white/15 hover:bg-slate-800 transition-all cursor-pointer shadow-md active:scale-95"
                title="Switch Camera (Front/Rear)"
              >
                <SwitchCamera className="w-4 h-4 text-slate-200" />
              </button>
            </div>

            {/* Bottom Shutter Controls */}
            <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-6 z-10">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/80 text-white border border-white/20 hover:bg-slate-800 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
              >
                Cancel
              </button>

              {/* Ergonomic Tactile Shutter */}
              <button
                type="button"
                onClick={capturePhoto}
                className="w-18 h-18 rounded-full border-4 border-white/80 bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.4)] flex items-center justify-center transition-all cursor-pointer transform active:scale-90 hover:scale-105"
                title="Capture Dish"
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-inner">
                  <Camera className="w-6 h-6 text-emerald-700" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Captured Image Display with Segmentation HUD */}
        {!isCameraActive && displayedImageUrl && (
          <div className="relative aspect-4/3 sm:aspect-16/9 bg-slate-950 flex items-center justify-center overflow-hidden">
            <img
              src={displayedImageUrl}
              alt="Scanned Food Leftover"
              className="w-full h-full object-contain"
            />

            {/* Precision Optical Laser Scan Animation */}
            {(stage === "uploading" || stage === "analyzing") && (
              <div className="scanner-laser" />
            )}

            {/* Result Stage: Floating Modern HUD */}
            {stage === "result" && scanResult && (
              <>
                {/* Top-Left: Identified Food Badge */}
                <div className="absolute top-4 left-4 z-20 bg-slate-900/85 backdrop-blur-md text-white px-4 py-2.5 rounded-xl border border-white/15 shadow-hud flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Identified Food Item
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <span>{scanResult.final_food_name || scanResult.ai_food_prediction}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-mono font-bold border ${
                          confidencePercent >= 80
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {confidencePercent}% Match
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top-Right: Annotated vs Original View Toggle */}
                {scanResult.annotated_image_url && (
                  <div className="absolute top-4 right-4 z-20 flex items-center bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-hud">
                    <button
                      type="button"
                      onClick={() => setViewMode("annotated")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewMode === "annotated"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Bounding Box
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("original")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewMode === "original"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Original
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Initial Idle Screen - Redesigned, High-Impact & Frictionless */}
        {stage === "idle" && !isCameraActive && !imagePreviewUrl && (
          <div
            className={`p-6 sm:p-10 text-center space-y-8 transition-colors ${
              isDragOver ? "bg-emerald-50/40" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="max-w-md mx-auto space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60 shadow-xs">
                <ScanLine className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-slate-900 tracking-tight">
                Optical Food Waste Analysis
              </h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                Capture the leftover tray or dish. The AI model segments portions, classifies food items, and estimates kitchen loss value in real time.
              </p>
            </div>

            {/* 2 Primary Modern Action Terminals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Terminal 1: Live Camera Feed */}
              <button
                type="button"
                onClick={() => startCamera()}
                className="group p-6 rounded-2xl border-2 border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-card-hover transition-all text-left flex flex-col justify-between space-y-5 cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                    Real-Time
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                    Launch Device Camera
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                    Open webcam or tablet camera with live viewfinder reticle for rapid banquet dish capture.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span>Start Live Scan</span>
                  <span>→</span>
                </div>
              </button>

              {/* Terminal 2: High-Resolution Photo Upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group p-6 rounded-2xl border-2 border-slate-200/90 bg-white hover:border-slate-900 hover:shadow-card-hover transition-all text-left flex flex-col justify-between space-y-5 cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    JPG / PNG
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-slate-900 transition-colors flex items-center gap-1.5">
                    Upload Dish Photo
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                    Upload an existing photo or drag & drop high-resolution leftover dish images directly.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Browse Photos</span>
                  <span>→</span>
                </div>
              </button>
            </div>

            {/* Spec Footer Pill */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 max-w-lg mx-auto flex items-center gap-3 text-left text-xs text-slate-600 font-normal">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Equipped with custom <strong>YOLO 31-Class Indian Food Model</strong> with pan depth volumetric calibration.
              </span>
            </div>
          </div>
        )}

        {/* Processing State with High-Tech Pulse */}
        {(stage === "uploading" || stage === "analyzing") && (
          <div className="p-10 text-center space-y-4 bg-slate-900 text-white">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Zap className="w-7 h-7 animate-pulse text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white tracking-wide">Processing Optical Inference</h4>
              <p className="text-xs text-emerald-400 font-medium">{stageMessage}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {stage === "error" && (
          <div className="p-8 bg-rose-500/5 border-t border-rose-200 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
            <div>
              <h4 className="text-base font-bold text-rose-950">Inference Analysis Failed</h4>
              <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">{errorMessage}</p>
            </div>
            <button
              onClick={handleReset}
              className="hotel-btn-primary bg-rose-600 hover:bg-rose-700 border-rose-600 text-xs active:scale-95"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success / Result Stage - Modern Culinary Metric Deck */}
        {stage === "result" && scanResult && !isEditing && (
          <div className="p-6 sm:p-8 space-y-6 bg-white border-t border-slate-200/80">
            {/* Low confidence warning banner */}
            {scanResult.is_low_confidence && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-semibold flex items-start gap-3 shadow-2xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-950 font-bold">
                    Low Confidence Prediction ({confidencePercent}%)
                  </strong>
                  <p className="font-normal mt-0.5 text-amber-800">
                    The optical confidence is below recommended threshold. Tap &quot;Correct Food Item&quot; to audit or select the right menu dish.
                  </p>
                </div>
              </div>
            )}

            {/* Detection Summary Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Detected Food Dish
                </span>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
                  {scanResult.final_food_name || scanResult.ai_food_prediction}
                  {scanResult.human_verified && (
                    <CheckCircle className="w-5 h-5 text-emerald-600 inline" />
                  )}
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  AI Optical Confidence
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-lg inline-block border ${
                    confidencePercent >= 80
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {confidencePercent}% Accuracy Match
                </span>
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Dish Category
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 truncate block">
                  {matchedFoodItem?.category || "Main Course"}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Menu Specification
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Vision Model Engine
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 truncate block">
                  {scanResult.ai_model_name || "YOLO Food Model"}
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                  {confidencePercent}% Precision
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Audit State
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  {scanResult.human_verified ? "Staff Verified" : "Optical Estimated"}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {scanResult.human_verified ? "Verified by kitchen staff" : "Automated AI Detection"}
                </span>
              </div>
            </div>

            {/* Fast Action Buttons Deck */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="hotel-btn-secondary text-xs active:scale-95"
              >
                <Edit3 className="w-4 h-4 text-slate-500" />
                Correct Food Item
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="hotel-btn-secondary text-xs active:scale-95"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleConfirmScan}
                  className="hotel-btn-emerald text-xs active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  Confirm & Commit to Banquet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Audit Correction View */}
        {stage === "result" && scanResult && isEditing && (
          <div className="p-6 sm:p-8 space-y-5 bg-white border-t border-slate-200/80">
            <h3 className="font-serif text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Staff Optical Audit Override
            </h3>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Select Correct Food Dish
              </label>
              <select
                value={correctedFoodId}
                onChange={(e) => setCorrectedFoodId(Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer shadow-2xs"
              >
                {catalog.map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.name} ({food.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Staff Audit Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Optical misclassification corrected by chef."
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="hotel-btn-secondary text-xs active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                className="hotel-btn-primary text-xs active:scale-95"
              >
                <Save className="w-4 h-4" />
                Save Audit Correction
              </button>
            </div>
          </div>
        )}

        {/* Confirmed Animation Screen */}
        {stage === "confirmed" && (
          <div className="p-12 text-center space-y-4 bg-emerald-500/10 text-emerald-950">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg transform scale-100 animate-soft-pulse">
              <Check className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-xl font-bold text-emerald-900">
                Scan Logged to Banquet
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
