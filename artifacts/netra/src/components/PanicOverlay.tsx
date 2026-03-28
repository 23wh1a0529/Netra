import React from "react";
import { AlertTriangle } from "lucide-react";
import { useSocket } from "@/contexts/SocketContext";
import { useCreateAlert, useSendSms } from "@workspace/api-client-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export function PanicOverlay() {
  const { hasPanic, clearPanic } = useSocket();
  const createAlert = useCreateAlert();
  const sendSms = useSendSms();

  if (!hasPanic) return null;

  const handleDutyOfficerAlert = () => {
    try {
      const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, actx.currentTime);
      osc.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + 0.2);
      toast.success("Duty Officer Alerted Successfully");
    } catch (e) {}
  };

  const handleSms = () => {
    sendSms.mutate({ data: { to: "SP_OFFICE", message: "CRITICAL PANIC ALERT INITIATED" } }, {
      onSuccess: () => toast.success("SMS sent to SP Office"),
      onError: () => toast.error("Failed to send SMS")
    });
  };

  const handleMarkCritical = () => {
    createAlert.mutate({
      data: { type: "PANIC", level: "L3", officerId: "UNKNOWN", zone: "ALL", message: "Manual System Panic Triggered", severity: "CRITICAL" }
    }, {
      onSuccess: () => {
        toast.success("Critical incident logged");
        clearPanic();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white/95 flex flex-col items-center justify-center flash-border border-[16px] border-destructive p-6">
      <AlertTriangle className="w-32 h-32 text-destructive animate-bounce mb-8 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
      
      <h1 className="text-4xl md:text-6xl font-bold text-destructive tracking-wider mb-4 text-center">
        EMERGENCY ESCALATION INITIATED
      </h1>
      <p className="text-xl md:text-2xl text-foreground font-semibold mb-12 text-center max-w-2xl">
        An officer has triggered an SOS or a critical breach has occurred. Immediate action required.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-3xl">
        <button 
          onClick={handleDutyOfficerAlert}
          className="flex-1 py-4 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
        >
          Alert Duty Officer
        </button>
        <button 
          onClick={handleSms}
          disabled={sendSms.isPending}
          className="flex-1 py-4 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
        >
          SMS to SP Office
        </button>
        <button 
          onClick={handleMarkCritical}
          disabled={createAlert.isPending}
          className="flex-1 py-4 px-6 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
        >
          Mark Critical Incident
        </button>
      </div>

      <button 
        onClick={clearPanic}
        className="mt-12 py-3 px-8 rounded-full border-2 border-muted-foreground text-muted-foreground hover:bg-muted hover:text-foreground font-bold transition-colors"
      >
        Cancel / False Alarm
      </button>
    </div>
  );
}
