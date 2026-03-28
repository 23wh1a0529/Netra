import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export function SplashScreen() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          setTimeout(() => setLocation("/login"), 300);
          return 100;
        }
        return p + 2;
      });
    }, 40);

    return () => clearInterval(timer);
  }, [setLocation]);

  return (
    <motion.div 
      initial={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-[#0a0f1e] flex flex-col items-center justify-center overflow-hidden z-50 scanline"
    >
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Logo */}
        <div className="relative w-40 h-40 mb-8">
          <svg viewBox="0 0 100 100" className="w-full h-full text-primary drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]">
            <ellipse cx="50" cy="50" rx="40" ry="25" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
            <motion.circle 
              cx="50" cy="50" r="15" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="4"
              strokeDasharray="20 10"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            />
            <circle cx="50" cy="50" r="5" fill="currentColor" className="animate-pulse" />
          </svg>
        </div>

        {/* Text */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-telugu text-6xl text-primary font-bold mb-2 drop-shadow-md"
        >
          నేత్ర
        </motion.h1>
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white text-3xl tracking-[0.4em] font-bold mb-6"
        >
          NETRA
        </motion.h2>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="text-center"
        >
          <p className="font-telugu text-lg text-slate-400 mb-1">మూయని నేత్రం</p>
          <p className="text-sm text-slate-500 tracking-widest uppercase">The Eye That Never Closes</p>
        </motion.div>
      </div>

      {/* Progress Bar & Text */}
      <div className="absolute bottom-16 w-64 max-w-[80vw]">
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div 
            className="h-full bg-primary shadow-[0_0_10px_rgba(14,165,233,0.8)] transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-primary/70 font-mono text-[10px] text-center uppercase tracking-wider h-4">
          {progress < 100 ? "Initializing Anantapur Tactical Grid..." : "System Ready"}
        </p>
      </div>
    </motion.div>
  );
}
