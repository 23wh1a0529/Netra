import React, { useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFaceVerify } from "@workspace/api-client-react";
import { ScanFace, CheckCircle2, XCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

export function FaceVerifyPage() {
  const { officerId } = useAuth();
  const verifyReq = useFaceVerify();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasStream, setHasStream] = useState(false);
  const [permDenied, setPermDenied] = useState(false);
  const [result, setResult] = useState<"idle" | "loading" | "success" | "fail">("idle");
  const [confidence, setConfidence] = useState(0);

  const startCamera = useCallback(async () => {
    // Stop any existing stream
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setHasStream(false);
    setPermDenied(false);
    setResult("idle");

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = s;

      // Assign directly to the video element which is always in DOM
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
      }
      setHasStream(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermDenied(true);
        toast.error("Camera permission denied. Allow camera in browser settings.");
      } else {
        toast.error("Camera not available on this device.");
      }
    }
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !hasStream) return;
    setResult("loading");

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror the capture to match what user sees
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const b64 = canvas.toDataURL("image/jpeg", 0.9);

    setTimeout(() => {
      verifyReq.mutate(
        { data: { officerId: officerId || "UNK", image: b64, latitude: 14.6819, longitude: 77.6006 } },
        {
          onSuccess: (data) => {
            setConfidence(data.confidence);
            setResult(data.success ? "success" : "fail");
            if (data.success) toast.success("Identity verified! Attendance marked.");
          },
          onError: () => setResult("fail"),
        }
      );
    }, 1000);
  };

  const resetScanner = () => {
    setResult("idle");
    startCamera();
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Header */}
      <div className="text-center w-full">
        <h1 className="text-2xl font-bold font-sans">Face Attendance</h1>
        <p className="text-muted-foreground text-sm mt-1">Look directly at the camera to verify identity</p>
      </div>

      {/* Camera Viewfinder — always in DOM, visibility controlled by CSS */}
      <div className="relative w-64 h-64 rounded-3xl overflow-hidden bg-slate-900 border-4 border-border shadow-2xl">

        {/* Video is ALWAYS rendered so ref is always valid */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover scale-x-[-1] transition-opacity duration-300",
            hasStream ? "opacity-100" : "opacity-0"
          )}
        />

        {/* No stream placeholder */}
        {!hasStream && !permDenied && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
            <ScanFace className="w-14 h-14 opacity-30 animate-pulse" />
            <p className="text-xs font-semibold">Tap Start to begin</p>
          </div>
        )}

        {permDenied && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 p-4">
            <XCircle className="w-10 h-10 text-destructive/60" />
            <p className="text-xs text-center font-semibold text-slate-300">Camera blocked.<br />Enable permission in browser settings.</p>
          </div>
        )}

        {/* Corner guides */}
        {hasStream && (
          <>
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/70 rounded-tl-lg pointer-events-none" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/70 rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/70 rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/70 rounded-br-lg pointer-events-none" />
          </>
        )}

        {/* Scan line animation */}
        {result === "loading" && (
          <motion.div
            initial={{ top: "5%" }} animate={{ top: "95%" }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "linear", repeatType: "reverse" }}
            className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_12px_4px_rgba(14,165,233,0.8)] z-10"
          />
        )}

        {/* Success overlay */}
        <AnimatePresence>
          {result === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-emerald-500/85 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20"
            >
              <CheckCircle2 className="w-16 h-16 mb-2" />
              <span className="font-bold text-lg tracking-widest">VERIFIED</span>
              <span className="text-sm mt-1 opacity-90">{confidence}% confidence</span>
            </motion.div>
          )}
          {result === "fail" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-destructive/85 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20"
            >
              <XCircle className="w-16 h-16 mb-2" />
              <span className="font-bold text-lg tracking-widest">FAILED</span>
              <span className="text-xs mt-1 px-4 text-center opacity-90">Face not recognized — try again</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info note */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-700 w-full">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold mb-0.5">Location Required</p>
          <p className="opacity-90 text-xs">You must be within your assigned duty zone to mark attendance.</p>
        </div>
      </div>

      {/* Action Button */}
      <div className="w-full space-y-3">
        {!hasStream && !permDenied && (
          <button
            onClick={startCamera}
            className="w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-2xl shadow-xl transition-all hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            <ScanFace className="w-5 h-5" /> Start Camera
          </button>
        )}

        {hasStream && result === "idle" && (
          <button
            onClick={handleCapture}
            className="w-full py-4 bg-foreground text-background font-bold text-lg rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <ScanFace className="w-5 h-5" /> Capture & Verify
          </button>
        )}

        {result === "loading" && (
          <button disabled className="w-full py-4 bg-primary/80 text-primary-foreground font-bold text-lg rounded-2xl flex items-center justify-center gap-2 opacity-80">
            <RefreshCw className="w-5 h-5 animate-spin" /> Analyzing...
          </button>
        )}

        {(result === "success" || result === "fail") && (
          <button
            onClick={resetScanner}
            className="w-full py-4 bg-secondary text-foreground font-bold text-lg rounded-2xl transition-all border border-border flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" /> Try Again
          </button>
        )}

        {permDenied && (
          <button
            onClick={startCamera}
            className="w-full py-4 bg-destructive/10 text-destructive font-bold text-lg rounded-2xl border border-destructive/20 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" /> Retry Camera Access
          </button>
        )}
      </div>
    </div>
  );
}
