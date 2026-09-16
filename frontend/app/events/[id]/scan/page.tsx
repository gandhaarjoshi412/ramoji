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
  SwitchCamera,
  Layers,
  Eye,
  EyeOff,
  Image as ImageIcon,
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
          ? "Camera permission denied. Please allow camera permissions in your browser or use image upload."
          : "Could not access camera device. Please connect a webcam or use the upload button."
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

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedImageBlob(blob);
        const previewUrl = URL.createObjectURL(blob);
        setImagePreviewUrl(previewUrl);
        stopCamera();
        processScan(blob);
      }
    }, "image/jpeg", 0.92);
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
    setStageMessage("Transmitting high-resolution dish image...");
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", fileBlob, "dish_scan.jpg");

    try {
      setStage("analyzing");
      setStageMessage("Running YOLO food classification & volumetric waste estimation...");

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
    }, 1500);
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

  // Determine which image to show: Annotated YOLO bounding-box vs Original
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Hidden File Input & Canvas */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
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
              AI Food Waste Scanner
            </h1>
            <p className="text-xs text-slate-500 font-normal">
              {event?.name ? `Banquet Audit: ${event.name}` : "Optical volumetric food waste analysis"}
            </p>
          </div>
        </div>

        {stage !== "idle" && (
          <button onClick={handleReset} className="hotel-btn-secondary text-xs py-1.5 px-3">
            <RotateCcw className="w-3.5 h-3.5" />
            New Scan
          </button>
        )}
      </div>

      {/* Camera Error Banner */}
      {cameraError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{cameraError}</p>
          </div>
          <button
            onClick={() => setCameraError(null)}
            className="text-amber-700 hover:text-amber-900 text-xs font-bold underline"
          >
            Dismiss
          </button>
        </div>
      )}

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
              <div className="text-center space-y-1">
                <span className="text-[11px] font-bold text-[#f4d89a] uppercase tracking-widest bg-black/70 px-3.5 py-1.5 rounded-md backdrop-blur-md border border-white/10 inline-block shadow-lg">
                  Align Chafing Dish or Platter
                </span>
              </div>
            </div>

            {/* Top Bar Controls in Camera */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
              <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Camera Feed
              </span>

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-black/90 transition-colors"
                title="Switch Camera (Front/Rear)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Camera Controls */}
            <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-6 z-10">
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
                className="w-16 h-16 rounded-full border-4 border-white bg-[#b48324] hover:bg-[#966814] shadow-2xl flex items-center justify-center transition-all cursor-pointer transform active:scale-95 hover:scale-105"
                title="Capture Frame"
              >
                <Camera className="w-7 h-7 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Captured Image Preview with Bounding Box Overlay */}
        {!isCameraActive && displayedImageUrl && (
          <div className="relative aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden">
            <img
              src={displayedImageUrl}
              alt="Scanned Food Leftover"
              className="w-full h-full object-contain"
            />

            {/* Laser Scanning Animation during processing */}
            {(stage === "uploading" || stage === "analyzing") && <div className="scanner-laser" />}

            {/* Result Stage: Floating HUD with Dish Name & Confidence */}
            {stage === "result" && scanResult && (
              <>
                {/* Top-Left: Primary Prediction HUD Banner */}
                <div className="absolute top-4 left-4 z-20 bg-slate-950/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl border border-[#b48324]/50 shadow-2xl flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                      Identified Food Dish
                    </div>
                    <div className="text-sm sm:text-base font-bold text-[#f4d89a] flex items-center gap-2">
                      <span>{scanResult.final_food_name || scanResult.ai_food_prediction}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                        {Math.round(scanResult.ai_confidence * 100)}% Match
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top-Right: Annotated vs Original View Toggle */}
                {scanResult.annotated_image_url && (
                  <div className="absolute top-4 right-4 z-20 flex items-center bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-xl">
                    <button
                      type="button"
                      onClick={() => setViewMode("annotated")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        viewMode === "annotated"
                          ? "bg-[#b48324] text-white shadow-sm"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Bounding Box
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("original")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        viewMode === "original"
                          ? "bg-[#b48324] text-white shadow-sm"
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

        {/* Initial Idle Screen with 2 Dedicated Buttons (Camera & Upload) */}
        {stage === "idle" && !isCameraActive && !imagePreviewUrl && (
          <div
            className={`p-8 sm:p-12 text-center space-y-6 transition-colors ${
              isDragOver ? "bg-amber-50/50" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-[#b48324] flex items-center justify-center border border-[#b48324]/20 shadow-xs">
              <Sparkles className="w-8 h-8 text-[#b48324]" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="font-serif text-2xl font-bold text-slate-900 tracking-tight">
                Scan Food Waste Dish
              </h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                Choose your scanning method below. The trained YOLO vision model segments the food dish, detects portion volume, and calculates raw banquet cost loss.
              </p>
            </div>

            {/* 2 Primary Dedicated Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-2">
              {/* Button 1: Live Camera Feed */}
              <button
                type="button"
                onClick={() => startCamera()}
                className="group p-6 rounded-2xl border-2 border-[#b48324]/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent hover:border-[#b48324] hover:shadow-xl hover:shadow-amber-500/10 transition-all text-left flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-xl bg-[#b48324] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#b48324] bg-amber-100/80 px-2.5 py-1 rounded-full">
                    Real-Time
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-[#b48324] transition-colors flex items-center gap-1.5">
                    Use Live Camera Feed
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                    Open your device webcam or phone camera to align and capture the dish in real time.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#b48324]/20 flex items-center justify-between text-xs font-bold text-[#b48324]">
                  <span>Launch Camera</span>
                  <span>→</span>
                </div>
              </button>

              {/* Button 2: Upload Food Image */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-800 hover:shadow-xl hover:shadow-slate-900/5 transition-all text-left flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <Upload className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                    File Upload
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-slate-800 transition-colors flex items-center gap-1.5">
                    Upload Dish Image
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                    Select a high-resolution photo from your device or drag & drop JPG / PNG directly.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Browse Files</span>
                  <span>→</span>
                </div>
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto flex items-start gap-2.5 text-left text-xs text-slate-600 font-normal">
              <Info className="w-4 h-4 text-[#b48324] shrink-0 mt-0.5" />
              <span>
                Supported by the custom <strong>YOLO 31-Class Indian Food Model</strong> with automated volumetric weight and cost calculation.
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
                  <strong className="block text-amber-950 font-bold">
                    Low Confidence Prediction ({Math.round(scanResult.ai_confidence * 100)}%)
                  </strong>
                  <p className="font-normal mt-0.5 text-amber-800">
                    The optical confidence is below target. Click &quot;Correct Food Item&quot; below if the dish is misclassified.
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
                <span className="font-serif text-2xl font-bold text-slate-900 flex items-center gap-2">
                  {scanResult.final_food_name || scanResult.ai_food_prediction}
                  {scanResult.human_verified && (
                    <CheckCircle className="w-5 h-5 text-emerald-600 inline" />
                  )}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  AI Optical Confidence
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-md inline-block mt-0.5 border ${
                    scanResult.ai_confidence >= 0.85
                      ? "bg-emerald-50 text-[#064e3b] border-emerald-200"
                      : "bg-amber-50 text-[#b48324] border-amber-200"
                  }`}
                >
                  {Math.round(scanResult.ai_confidence * 100)}% Match
                </span>
              </div>
            </div>

            {/* Detection Details Grid (Weight & Cost Removed) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Dish Category
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 truncate block">
                  {matchedFoodItem?.category || "Indian Cuisine"}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Standard Menu Classification
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  AI Model Engine
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-800 truncate block">
                  {scanResult.ai_model_name || "YOLO Food Model"}
                </span>
                <span className="text-[11px] text-[#b48324] font-medium block mt-0.5">
                  {Math.round(scanResult.ai_confidence * 100)}% Match Accuracy
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Audit Status
                </span>
                <span className="text-base sm:text-lg font-bold text-[#064e3b] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  {scanResult.human_verified ? "Staff Verified" : "Optical Estimated"}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {scanResult.human_verified ? "Verified by kitchen staff" : "Automated AI Detection"}
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
                Correct Food Item
              </button>

              <div className="flex items-center gap-3">
                <button type="button" onClick={handleReset} className="hotel-btn-secondary text-xs">
                  Discard
                </button>
                <button type="button" onClick={handleConfirmScan} className="hotel-btn-gold text-xs">
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
                placeholder="e.g. AI misclassified curry dish; corrected by chef."
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
