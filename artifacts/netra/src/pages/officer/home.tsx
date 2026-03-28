import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useListAnnouncements, useCreateAlert, useGetOfficer } from "@workspace/api-client-react";
import { MapContainer, TileLayer, Circle, CircleMarker } from "react-leaflet";
import { AlertTriangle, MapPin, Clock, Info } from "lucide-react";
import { toast } from "react-hot-toast";

export function OfficerHome() {
  const { name, officerId } = useAuth();
  const { data: officer } = useGetOfficer(officerId || "");
  const { data: announcements = [] } = useListAnnouncements();
  const createAlert = useCreateAlert();
  
  const [sosOpen, setSosOpen] = useState(false);
  const [sosMsg, setSosMsg] = useState("");
  
  // Dummy location for officer view mapping if actual coords missing
  const lat = officer?.latitude || 14.6819;
  const lng = officer?.longitude || 77.6006;

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

  return (
    <div className="space-y-4">
      {/* Welcome Card */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm mt-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
        <h2 className="text-sm font-semibold text-muted-foreground">Duty Status</h2>
        <h1 className="text-2xl font-bold font-sans mt-1">Stay Safe, {name?.split(' ')[0]}</h1>
        
        <div className="mt-6 flex items-center justify-between bg-secondary p-3 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-600 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Assigned Zone</p>
              <p className="font-bold text-foreground">{officer?.zone || "Loading..."}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Snapshot */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-48 relative pointer-events-none">
        <MapContainer center={[lat, lng]} zoom={16} className="w-full h-full z-0" zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          <Circle center={[lat, lng]} radius={40} pathOptions={{ color: '#0ea5e9', weight: 2, fillOpacity: 0.1 }} />
          <CircleMarker center={[lat, lng]} radius={8} pathOptions={{ color: '#10b981', fillColor: '#fff', fillOpacity: 1, weight: 3 }} />
        </MapContainer>
        <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded-md text-[10px] font-bold shadow-sm z-10 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> GPS Active
        </div>
      </div>

      {/* Announcements */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1 flex items-center gap-1">
          <Info className="w-3 h-3" /> Recent Broadcasts
        </h3>
        <div className="space-y-2">
          {announcements.slice(0, 2).map(a => (
            <div key={a.id} className="bg-card p-3 rounded-xl border-l-4 border-l-primary border-y border-r border-border shadow-sm text-sm font-medium">
              <p>{a.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">{new Date(a.createdAt).toLocaleTimeString()}</p>
            </div>
          ))}
          {announcements.length === 0 && (
            <div className="bg-secondary p-3 rounded-xl text-center text-sm text-muted-foreground">No recent broadcasts.</div>
          )}
        </div>
      </div>

      {/* SOS Button Overlay Trigger */}
      <div className="fixed bottom-24 right-4 z-40">
        <button 
          onClick={() => setSosOpen(true)}
          className="w-16 h-16 bg-destructive text-white rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center font-bold text-lg tracking-wider border-4 border-white animate-bounce"
        >
          SOS
        </button>
      </div>

      {/* SOS Modal */}
      <AnimatePresence>
        {sosOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={() => setSosOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-card rounded-t-3xl shadow-2xl z-50 p-6 flex flex-col items-center">
              <div className="w-12 h-1.5 bg-muted rounded-full mb-6" />
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-destructive/5">
                <AlertTriangle className="w-10 h-10 text-destructive animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-destructive mb-2">Emergency SOS</h2>
              <p className="text-center text-muted-foreground mb-6 text-sm">This will alert the SP Office and Command Center immediately.</p>
              
              <textarea 
                value={sosMsg} onChange={e=>setSosMsg(e.target.value)}
                placeholder="Optional: What is happening?"
                className="w-full p-3 bg-secondary border border-border rounded-xl mb-6 outline-none focus:ring-2 focus:ring-destructive/50 resize-none h-24 text-sm"
              />
              
              <div className="w-full flex gap-3">
                <button onClick={() => setSosOpen(false)} className="flex-1 py-4 bg-secondary text-foreground font-bold rounded-xl">Cancel</button>
                <button onClick={handleSOS} disabled={createAlert.isPending} className="flex-1 py-4 bg-destructive text-white font-bold rounded-xl shadow-lg shadow-destructive/30">SEND PANIC</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
