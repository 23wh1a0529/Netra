import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFaceVerify } from "@workspace/api-client-react";
import { Camera, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

export function FaceVerifyPage() {
  const { officerId, name } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const verifyReq = useFaceVerify();
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<'idle' | 'loading' | 'success' | 'fail'>('idle');
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        toast.error("Camera access denied or unavailable.");
      }
    }
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    setResult('loading');
    
    // Simulate canvas capture -> base64
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const b64 = canvas.toDataURL("image/jpeg");
      
      // Simulate GPS fetch delay then API call
      setTimeout(() => {
        verifyReq.mutate({ data: { officerId: officerId || "UNK", image: b64, latitude: 14.6819, longitude: 77.6006 } }, {
          onSuccess: (data) => {
            setConfidence(data.confidence);
            if (data.success) setResult('success');
            else setResult('fail');
          },
          onError: () => setResult('fail')
        });
      }, 800);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="text-center mt-4">
        <h1 className="text-2xl font-bold font-sans">Identity Verification</h1>
        <p className="text-muted-foreground text-sm mt-1">Mark your attendance (Check-in/out)</p>
      </div>

      {/* Camera Viewfinder */}
      <div className="relative w-64 h-64 mx-auto rounded-3xl overflow-hidden bg-slate-900 border-4 border-border shadow-inner">
        {stream ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <Camera className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-xs">Waiting for camera...</p>
          </div>
        )}
        
        {/* Overlay scanning effects */}
        <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-2xl pointer-events-none" />
        {result === 'loading' && (
          <motion.div 
            initial={{ top: '0%' }} animate={{ top: '100%' }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-primary/80 shadow-[0_0_15px_rgba(14,165,233,1)] z-10"
          />
        )}

        {/* Result Overlays */}
        {result === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-emerald-500/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
            <CheckCircle2 className="w-16 h-16 mb-2" />
            <span className="font-bold tracking-widest uppercase">Verified</span>
            <span className="text-xs">{confidence}% Match</span>
          </motion.div>
        )}
        {result === 'fail' && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-destructive/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
            <XCircle className="w-16 h-16 mb-2" />
            <span className="font-bold tracking-widest uppercase">Failed</span>
            <span className="text-xs mt-1 px-4 text-center">Look directly at camera</span>
          </motion.div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-700">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold mb-1">Location Required</p>
          <p className="opacity-90">You must be within 50 meters of your assigned duty zone to mark attendance.</p>
        </div>
      </div>

      <div className="mt-auto pt-4">
        {result === 'idle' || result === 'fail' ? (
          <button 
            onClick={handleCapture}
            disabled={!stream || result === 'loading'}
            className="w-full py-4 bg-foreground hover:bg-foreground/90 text-background font-bold text-lg rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" /> 
            {result === 'loading' ? 'Analyzing...' : 'Capture & Verify'}
          </button>
        ) : (
          <button 
            onClick={() => setResult('idle')}
            className="w-full py-4 bg-secondary hover:bg-secondary/80 text-foreground font-bold text-lg rounded-2xl transition-all border border-border"
          >
            Reset Scanner
          </button>
        )}
      </div>
    </div>
  );
}
