import React, { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlipHorizontal2, Zap, ZapOff, Trash2, Download, Send, Tag, X, CheckCircle2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateAlert } from "@workspace/api-client-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

const TAGS = ["Crowd", "Suspect", "Scene", "Evidence", "Violation", "Other"] as const;
type TagType = typeof TAGS[number];

interface Capture {
  id: string;
  dataUrl: string;
  tag: TagType;
  note: string;
  ts: Date;
  reported: boolean;
}

const TAG_COLORS: Record<TagType, string> = {
  Crowd:     "bg-blue-500/15 text-blue-700 border-blue-300",
  Suspect:   "bg-red-500/15 text-red-700 border-red-300",
  Scene:     "bg-purple-500/15 text-purple-700 border-purple-300",
  Evidence:  "bg-amber-500/15 text-amber-700 border-amber-300",
  Violation: "bg-orange-500/15 text-orange-700 border-orange-300",
  Other:     "bg-slate-500/15 text-slate-700 border-slate-300",
};

// Custom aperture/crosshair icon unique to NETRA field camera
function FieldCameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7" />
      <line x1="12" y1="1" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="1" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="23" y2="12" />
    </svg>
  );
}

export function OfficerCameraPage() {
  const { officerId } = useAuth();
  const createAlert = useCreateAlert();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hasStream, setHasStream] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [flash, setFlash] = useState(false);
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null);
  const [tagPicker, setTagPicker] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    // Stop existing
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setHasStream(false);
    setPermDenied(false);
    setTorchOn(false);

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = s;

      // Video element is always in DOM — assign directly
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
      }
      setHasStream(true);

      const track = s.getVideoTracks()[0];
      const caps = track.getCapabilities?.() as any;
      setTorchSupported(!!caps?.torch);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermDenied(true);
        toast.error("Camera permission denied.");
      } else {
        toast.error("Camera unavailable.");
      }
    }
  }, []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(t => !t);
    } catch {
      toast.error("Torch not supported.");
    }
  };

  const flipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !hasStream) return;

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const cap: Capture = {
      id: Date.now().toString(),
      dataUrl,
      tag: "Scene",
      note: "",
      ts: new Date(),
      reported: false,
    };
    setCaptures(prev => [cap, ...prev]);
    setTagPicker(cap.id);
    toast.success("Photo captured!");
  };

  const handleTagChange = (id: string, tag: TagType) => {
    setCaptures(prev => prev.map(c => c.id === id ? { ...c, tag } : c));
    setTagPicker(null);
  };

  const handleDelete = (id: string) => {
    setCaptures(prev => prev.filter(c => c.id !== id));
    if (selectedCapture?.id === id) setSelectedCapture(null);
  };

  const handleReport = (cap: Capture) => {
    createAlert.mutate({
      data: {
        type: "EVIDENCE",
        level: cap.tag === "Suspect" || cap.tag === "Violation" ? "L2" : "L1",
        officerId: officerId || "UNK",
        zone: "On-Scene",
        message: `${cap.tag} captured by officer${cap.note ? ": " + cap.note : ""}. Time: ${cap.ts.toLocaleString()}`,
      }
    }, {
      onSuccess: () => {
        setCaptures(prev => prev.map(c => c.id === cap.id ? { ...c, reported: true } : c));
        setSelectedCapture(s => s?.id === cap.id ? { ...s, reported: true } : s);
        toast.success("Reported to Command Center");
      }
    });
  };

  const handleDownload = (cap: Capture) => {
    const a = document.createElement("a");
    a.href = cap.dataUrl;
    a.download = `netra_${cap.tag.toLowerCase()}_${Date.now()}.jpg`;
    a.click();
    toast.success("Saved to device");
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-sans flex items-center gap-2">
          <FieldCameraIcon className="w-6 h-6 text-primary" /> Field Capture
        </h1>
        <p className="text-muted-foreground text-sm">Document on-scene evidence and report to HQ</p>
      </div>

      {/* Viewfinder */}
      <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border border-border shadow-xl">

        {/* Flash */}
        <AnimatePresence>
          {flash && (
            <motion.div initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-white z-30 pointer-events-none" />
          )}
        </AnimatePresence>

        {/* Video — ALWAYS in DOM */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            facingMode === "user" && "scale-x-[-1]",
            hasStream ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Placeholder when no stream */}
        {!hasStream && !permDenied && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
            <FieldCameraIcon className="w-16 h-16 opacity-20" />
            <p className="text-sm font-semibold">Tap Start Camera below</p>
          </div>
        )}

        {permDenied && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 px-6">
            <FieldCameraIcon className="w-12 h-12 opacity-20" />
            <p className="text-sm text-center font-semibold">Camera permission required.<br />Enable in browser settings.</p>
            <button onClick={() => startCamera(facingMode)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold">
              Retry
            </button>
          </div>
        )}

        {/* Corner guides */}
        {hasStream && (
          <>
            <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-white/60 rounded-tl-lg pointer-events-none" />
            <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-white/60 rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-white/60 rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-white/60 rounded-br-lg pointer-events-none" />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded-full text-[10px] font-bold text-emerald-400 mr-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </div>
          </>
        )}

        {/* Controls top */}
        {hasStream && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {torchSupported && (
              <button onClick={toggleTorch}
                className={cn("p-2 rounded-full border transition-all",
                  torchOn ? "bg-yellow-400 border-yellow-300 text-yellow-900" : "bg-black/50 border-white/20 text-white")}>
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}
            <button onClick={flipCamera} className="p-2 rounded-full bg-black/50 border border-white/20 text-white">
              <FlipHorizontal2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {captures.length > 0 && (
          <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full z-10">
            {captures.length} captured
          </div>
        )}
      </div>

      {/* Start / Capture Buttons */}
      {!hasStream ? (
        <button
          onClick={() => startCamera(facingMode)}
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-2"
        >
          <FieldCameraIcon className="w-5 h-5" /> Start Camera
        </button>
      ) : (
        <div className="flex items-center justify-center gap-6">
          <button onClick={flipCamera} className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:bg-card transition-all">
            <FlipHorizontal2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleCapture}
            className="w-20 h-20 rounded-full bg-white border-4 border-primary shadow-[0_0_20px_rgba(14,165,233,0.4)] flex items-center justify-center transition-all active:scale-95"
          >
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
              <FieldCameraIcon className="w-7 h-7 text-white" />
            </div>
          </button>
          <button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); setHasStream(false); }}
            className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Tag picker */}
      <AnimatePresence>
        {tagPicker && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="bg-card border border-border rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold flex items-center gap-1.5"><Tag className="w-4 h-4" /> Tag this capture</p>
              <button onClick={() => setTagPicker(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button key={tag} onClick={() => handleTagChange(tagPicker, tag)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105", TAG_COLORS[tag])}>
                  {tag}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery */}
      {captures.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FieldCameraIcon className="w-3.5 h-3.5" /> Session ({captures.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {captures.map(cap => (
              <motion.div key={cap.id} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square rounded-xl overflow-hidden border border-border cursor-pointer group"
                onClick={() => setSelectedCapture(cap)}>
                <img src={cap.dataUrl} alt="cap" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                  <span className="text-[9px] font-bold text-white">{cap.tag}</span>
                </div>
                {cap.reported && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selectedCapture && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" onClick={() => setSelectedCapture(null)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-card rounded-t-3xl z-50 shadow-2xl">
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 mb-0" />
              <img src={selectedCapture.dataUrl} alt="cap" className="w-full aspect-video object-cover" />
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-bold px-3 py-1 rounded-full border", TAG_COLORS[selectedCapture.tag])}>
                    {selectedCapture.tag}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {selectedCapture.ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
                <textarea
                  value={selectedCapture.note}
                  onChange={e => {
                    const note = e.target.value;
                    setCaptures(prev => prev.map(c => c.id === selectedCapture.id ? { ...c, note } : c));
                    setSelectedCapture(s => s ? { ...s, note } : s);
                  }}
                  placeholder="Add a note (optional)..."
                  rows={2}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleDelete(selectedCapture.id)}
                    className="flex flex-col items-center gap-1 py-3 bg-secondary hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-xl border border-border transition-all text-xs font-bold">
                    <Trash2 className="w-5 h-5" /> Delete
                  </button>
                  <button onClick={() => handleDownload(selectedCapture)}
                    className="flex flex-col items-center gap-1 py-3 bg-secondary text-foreground rounded-xl border border-border transition-all text-xs font-bold">
                    <Download className="w-5 h-5" /> Save
                  </button>
                  <button onClick={() => handleReport(selectedCapture)}
                    disabled={selectedCapture.reported || createAlert.isPending}
                    className={cn("flex flex-col items-center gap-1 py-3 rounded-xl border transition-all text-xs font-bold",
                      selectedCapture.reported
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-primary text-primary-foreground border-primary hover:bg-primary/90")}>
                    {selectedCapture.reported
                      ? <><CheckCircle2 className="w-5 h-5" /> Reported</>
                      : createAlert.isPending ? <><RefreshCw className="w-5 h-5 animate-spin" /> Sending...</>
                      : <><Send className="w-5 h-5" /> Report</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
