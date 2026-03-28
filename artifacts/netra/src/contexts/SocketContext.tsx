import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import { Alert } from "@workspace/api-client-react";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  hasPanic: boolean;
  clearPanic: () => void;
  triggerDemoPanic: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasPanic, setHasPanic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Only connect once
    const newSocket = io({
      path: "/socket.io",
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => setIsConnected(true));
    newSocket.on("disconnect", () => setIsConnected(false));

    newSocket.on("alert-triggered", (alert: Alert) => {
      toast.error(`ALERT: ${alert.officerName} - ${alert.message}`, { duration: 5000 });
      try {
        const synth = window.speechSynthesis;
        if (synth) {
          const utterance = new SpeechSynthesisUtterance(`Alert! Officer ${alert.officerName} has left ${alert.zone}`);
          synth.speak(utterance);
        }
      } catch (e) {
        // Speech synth might not be available or allowed yet
      }
    });

    newSocket.on("panic-triggered", () => {
      setHasPanic(true);
      // Try to play a loud beep
      try {
        const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = actx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, actx.currentTime);
        osc.connect(actx.destination);
        osc.start();
        osc.stop(actx.currentTime + 0.5);
      } catch (e) {}
    });

    newSocket.on("auto-check-in", ({ officerName }: { officerName: string }) => {
      toast.success(`Auto check-in: ${officerName}`);
    });

    newSocket.on("auto-check-out", ({ officerName }: { officerName: string }) => {
      toast.error(`Auto check-out: ${officerName}`, { icon: '⚠️' });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const clearPanic = () => setHasPanic(false);
  const triggerDemoPanic = () => setHasPanic(true);

  return (
    <SocketContext.Provider value={{ socket, isConnected, hasPanic, clearPanic, triggerDemoPanic }}>
      {children}
      {!isConnected && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-amber-500 text-white py-1 px-4 text-center font-bold text-sm tracking-wide">
          Connection lost — Reconnecting...
        </div>
      )}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
