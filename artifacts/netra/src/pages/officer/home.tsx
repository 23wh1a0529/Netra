import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useListAnnouncements, useCreateAlert, useGetOfficer } from "@workspace/api-client-react";
import { MapContainer, TileLayer, Circle, CircleMarker } from "react-leaflet";
import { AlertTriangle, MapPin, Clock, Info, ShieldCheck, Activity, BellRing } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

function formatDuration(startIso: string | null | undefined): string {
  if (!startIso) return "--";
  const diffMs = Date.now() - new Date(startIso).getTime();
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-sm tabular-nums">
      {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

export function OfficerHome() {
  const { name, officerId } = useAuth();
  const { data: officer } = useGetOfficer(officerId || "");
  const { data: announcements = [] } = useListAnnouncements();
  const createAlert = useCreateAlert();

  const [sosOpen, setSosOpen] = useState(false);
  const [sosMsg, setSosMsg] = useState("");
  const [dutyTime, setDutyTime] = useState("");

  const lat = officer?.latitude || 14.6819;
  const lng = officer?.longitude || 77.6006;

  useEffect(() => {
    if (!officer?.checkInTime) return;
    const update = () => setDutyTime(formatDuration(officer.checkInTime));
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [officer?.checkInTime]);

  const handleSOS = () => {
    createAlert.mutate({
      data: { type: "PANIC", level: "L3", officerId: officerId || "UNK", zone: officer?.zone || "Unknown", message: sosMsg || "Officer triggered SOS" }
    }, {
      onSuccess: () => {
        toast.success("SOS Alert Sent! Help is on the way.");
        setSosOpen(false);
        setSosMsg("");
      }
    });
  };

  const statusColor = officer?.status === "IN_ZONE" ? "text-emerald-600 bg-emerald-50"
    : officer?.status === "BREACH" ? "text-red-600 bg-red-50"
    : officer?.status === "LATE" ? "text-amber-600 bg-amber-50"
    : "text-muted-foreground bg-secondary";

  const compliance = officer?.compliance ?? 0;

  return (
    <div className="space-y-4 pb-4">

      {/* Welcome + Status Card */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"},</p>
            <h1 className="text-2xl font-bold font-sans mt-0.5">{name?.split(" ")[0]}</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">{officerId}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={cn("text-xs font-bold px-3 py-1 rounded-full", statusColor)}>
              {officer?.status?.replace("_", " ") ?? "Loading..."}
            </span>
            <LiveClock />
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="bg-secondary rounded-xl p-3 text-center">
            <MapPin className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Zone</p>
            <p className="text-xs font-bold leading-tight mt-0.5 truncate">{officer?.zone ?? "—"}</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground font-bold uppercase">On Duty</p>
            <p className="text-xs font-bold leading-tight mt-0.5">{dutyTime || (officer?.checkInTime ? formatDuration(officer.checkInTime) : "--")}</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Compliance</p>
            <p className={cn("text-xs font-bold leading-tight mt-0.5", compliance >= 80 ? "text-emerald-600" : compliance >= 60 ? "text-amber-600" : "text-destructive")}>
              {compliance}%
            </p>
          </div>
        </div>

        {/* Compliance bar */}
        <div className="mt-3">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${compliance}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn("h-full rounded-full", compliance >= 80 ? "bg-emerald-500" : compliance >= 60 ? "bg-amber-500" : "bg-destructive")}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Duty compliance score for today</p>
        </div>
      </div>

      {/* BREACH warning banner */}
      {officer?.status === "BREACH" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-center gap-3"
        >
          <AlertTriangle className="w-8 h-8 text-destructive flex-shrink-0 animate-pulse" />
          <div>
            <p className="font-bold text-destructive text-sm">Zone Breach Detected</p>
            <p className="text-xs text-destructive/80 mt-0.5">You are outside your assigned duty zone. Return immediately or contact your CI.</p>
          </div>
        </motion.div>
      )}

      {/* Map Snapshot */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden relative">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Live Location
          </p>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            GPS Active
          </div>
        </div>
        <div className="h-44 pointer-events-none">
          <MapContainer center={[lat, lng]} zoom={16} className="w-full h-full z-0" zoomControl={false} attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <Circle center={[lat, lng]} radius={40} pathOptions={{ color: "#0ea5e9", weight: 2, fillOpacity: 0.08 }} />
            <CircleMarker center={[lat, lng]} radius={9} pathOptions={{ color: "#10b981", fillColor: "#fff", fillOpacity: 1, weight: 3 }} />
          </MapContainer>
        </div>
        <div className="px-4 py-2 bg-secondary/50 border-t border-border">
          <p className="text-[10px] font-mono text-muted-foreground">{lat.toFixed(4)}°N {lng.toFixed(4)}°E · Last ping: just now</p>
        </div>
      </div>

      {/* Check-in info */}
      {officer?.checkInTime && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Checked In</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {new Date(officer.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · Face verified
            </p>
          </div>
        </div>
      )}

      {/* Announcements */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1 flex items-center gap-1.5">
          <BellRing className="w-3.5 h-3.5" /> Recent Broadcasts
        </h3>
        <div className="space-y-2">
          {announcements.slice(0, 3).map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card p-3.5 rounded-xl border-l-4 border-l-primary border-y border-r border-border shadow-sm"
            >
              <p className="text-sm font-medium leading-snug">{a.message}</p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] font-bold text-muted-foreground">{a.createdBy}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{new Date(a.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </motion.div>
          ))}
          {announcements.length === 0 && (
            <div className="bg-secondary p-3 rounded-xl text-center text-sm text-muted-foreground">No recent broadcasts.</div>
          )}
        </div>
      </div>

      {/* SOS — inline emergency section */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="font-bold text-destructive text-sm">Emergency Panic Alert</p>
          <p className="text-xs text-destructive/70 mt-0.5">Immediately notifies SP Office &amp; Command Center with your GPS location.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setSosOpen(true)}
          className="w-16 h-16 bg-destructive text-white rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center font-black text-sm tracking-widest border-4 border-white shrink-0"
        >
          SOS
        </motion.button>
      </div>

      {/* SOS Modal */}
      <AnimatePresence>
        {sosOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={() => setSosOpen(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-card rounded-t-3xl shadow-2xl z-50 p-6 flex flex-col items-center">
              <div className="w-12 h-1.5 bg-muted rounded-full mb-6" />
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-destructive/5">
                <AlertTriangle className="w-10 h-10 text-destructive animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-destructive mb-1">Emergency SOS</h2>
              <p className="text-center text-muted-foreground mb-6 text-sm">This will alert the SP Office and Command Center immediately.</p>

              <textarea
                value={sosMsg}
                onChange={e => setSosMsg(e.target.value)}
                placeholder="Optional: Describe the situation..."
                className="w-full p-3 bg-secondary border border-border rounded-xl mb-6 outline-none focus:ring-2 focus:ring-destructive/50 resize-none h-24 text-sm"
              />

              <div className="w-full flex gap-3">
                <button onClick={() => setSosOpen(false)} className="flex-1 py-4 bg-secondary text-foreground font-bold rounded-xl">Cancel</button>
                <button onClick={handleSOS} disabled={createAlert.isPending} className="flex-1 py-4 bg-destructive text-white font-bold rounded-xl shadow-lg shadow-destructive/30 disabled:opacity-50">
                  {createAlert.isPending ? "Sending..." : "SEND PANIC"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
