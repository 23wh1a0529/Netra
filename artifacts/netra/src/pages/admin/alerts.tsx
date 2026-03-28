import React from "react";
import { useListAlerts, useAcknowledgeAlert } from "@workspace/api-client-react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AlertsPage() {
  const { data: alerts = [], isLoading, refetch } = useListAlerts();
  const ackAlert = useAcknowledgeAlert();

  const handleAck = (id: number) => {
    ackAlert.mutate({ id }, { onSuccess: () => refetch() });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Incident Log</h1>
        <div className="flex gap-2">
          <span className="bg-destructive/10 text-destructive text-sm font-bold px-3 py-1 rounded-lg border border-destructive/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            L3 Critical: {alerts.filter(a => a.level === 'L3').length}
          </span>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 mb-4 text-emerald-500/50" />
            <p className="text-lg font-semibold">No incidents recorded.</p>
            <p className="text-sm">All zones are currently secure.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {alerts.map(alert => (
              <div key={alert.id} className={cn("p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-secondary/50", alert.acknowledged && "opacity-60")}>
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-xl mt-1 shrink-0", 
                    alert.level === 'L3' ? "bg-destructive text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]" : 
                    alert.level === 'L2' ? "bg-orange-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{alert.type} Alert</h3>
                      <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-foreground mb-1"><span className="font-semibold">{alert.officerName}</span> • Zone: {alert.zone}</p>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
                
                <div className="shrink-0">
                  {!alert.acknowledged ? (
                    <button 
                      onClick={() => handleAck(alert.id)}
                      disabled={ackAlert.isPending}
                      className="w-full sm:w-auto px-6 py-2.5 bg-card hover:bg-emerald-50 text-emerald-600 border-2 border-emerald-200 hover:border-emerald-500 rounded-xl font-bold transition-all shadow-sm"
                    >
                      Acknowledge
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-secondary text-muted-foreground rounded-lg font-semibold text-sm border border-border flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Resolved
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
