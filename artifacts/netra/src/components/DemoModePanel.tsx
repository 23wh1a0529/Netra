import React from "react";
import { X, Play, ArrowUpRight, RotateCcw } from "lucide-react";
import { useDemoBreach, useDemoEscalateL3, useDemoReset } from "@workspace/api-client-react";
import { toast } from "react-hot-toast";

interface DemoModePanelProps {
  onClose: () => void;
}

export function DemoModePanel({ onClose }: DemoModePanelProps) {
  const breach = useDemoBreach();
  const escalate = useDemoEscalateL3();
  const reset = useDemoReset();

  const handleAction = (mutation: any, successMsg: string) => {
    mutation.mutate(undefined, {
      onSuccess: () => toast.success(successMsg),
      onError: (err: any) => toast.error(err.message || "Demo action failed (API might not exist yet, that's OK!)")
    });
  };

  return (
    <div className="fixed bottom-6 left-6 z-[100] w-80 bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in slide-in-from-bottom-8">
      <div className="bg-primary px-4 py-3 flex items-center justify-between">
        <h3 className="text-primary-foreground font-bold font-mono tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          DEMO OVERRIDE
        </h3>
        <button onClick={onClose} className="text-primary-foreground/80 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <button 
          onClick={() => handleAction(breach, "Demo breach triggered")}
          disabled={breach.isPending}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold transition-all border border-border"
        >
          <span>Trigger Officer Breach</span>
          <Play className="w-4 h-4 text-destructive" />
        </button>
        <button 
          onClick={() => handleAction(escalate, "Escalated to L3")}
          disabled={escalate.isPending}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold transition-all border border-border"
        >
          <span>Escalate Alert to L3</span>
          <ArrowUpRight className="w-4 h-4 text-amber-500" />
        </button>
        <button 
          onClick={() => handleAction(reset, "System Reset")}
          disabled={reset.isPending}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold transition-all border border-destructive/20"
        >
          <span>Reset Demo Data</span>
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
