import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MapPin, AlertTriangle, UserX, ChevronRight, Phone, BellRing, LocateFixed, RefreshCw } from "lucide-react";
import { useGetDashboardStats, useGetBreachChart, useListPersonnel, useListAlerts, useAcknowledgeAlert } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

// Make sure map doesn't SSR crash if ever needed
import { MapContainer, TileLayer, Circle, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";

const ZONES = [
  { id: "Z1", name: "Collectorate", lat: 14.6819, lng: 77.6006, radius: 40 },
  { id: "Z2", name: "Gandhi Gunj", lat: 14.6853, lng: 77.5983, radius: 35 },
  { id: "Z3", name: "RTC Bus Stand", lat: 14.6791, lng: 77.5969, radius: 30 },
  { id: "Z4", name: "Subash Road", lat: 14.6831, lng: 77.5992, radius: 25 },
  { id: "Z5", name: "Helipad", lat: 14.6900, lng: 77.6050, radius: 50 },
];

export function AdminDashboard() {
  const statsQuery = useGetDashboardStats();
  const chartQuery = useGetBreachChart();
  const personnelQuery = useListPersonnel();
  const alertsQuery = useListAlerts({ limit: 10 });
  const ackAlert = useAcknowledgeAlert();

  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);

  const stats = statsQuery.data;
  const officers = personnelQuery.data || [];
  const alerts = alertsQuery.data || [];
  const selectedOfficer = officers.find(o => o.id === selectedOfficerId);

  const handleAck = (id: number) => {
    ackAlert.mutate({ id }, { onSuccess: () => alertsQuery.refetch() });
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Assigned" value={stats?.totalAssigned} icon={Users} color="bg-primary/10 text-primary" delay={0} />
        <StatCard title="In Zone" value={stats?.inZone} icon={MapPin} color="bg-emerald-500/10 text-emerald-600" delay={0.1} />
        <StatCard title="Violations" value={stats?.violations} icon={AlertTriangle} color="bg-destructive/10 text-destructive" highlight={!!stats?.violations} delay={0.2} />
        <StatCard title="Not Present" value={stats?.notPresent} icon={UserX} color="bg-amber-500/10 text-amber-600" delay={0.3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Officer List */}
        <div className="lg:col-span-1 bg-card rounded-2xl border border-border shadow-sm flex flex-col h-[500px]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-lg">Live Officer Status</h3>
            <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2.5 py-1 rounded-full">{officers.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {personnelQuery.isLoading ? (
              [...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)
            ) : (
              officers.map(officer => (
                <div 
                  key={officer.id}
                  onClick={() => setSelectedOfficerId(officer.id)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary cursor-pointer transition-colors group"
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-white border-2", 
                    officer.rank === 'CI' ? 'bg-amber-500 border-amber-200' :
                    officer.rank === 'SI' ? 'bg-primary border-primary-border' :
                    'bg-slate-500 border-slate-300'
                  )}>
                    {officer.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold truncate">{officer.name}</p>
                      <StatusBadge status={officer.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                      <span>{officer.rank} • {officer.zone}</span>
                      <span className="font-mono">{officer.lastSeen?.substring(11, 16) || '--:--'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Middle Col: Incident Log */}
        <div className="lg:col-span-1 bg-card rounded-2xl border border-border shadow-sm flex flex-col h-[500px]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-lg">Incident Log</h3>
            <button onClick={() => alertsQuery.refetch()} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <BellRing className="w-8 h-8 mb-2 opacity-20" />
                <p>No incidents reported today.</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={cn("p-3 rounded-xl border-l-4 bg-background shadow-sm", 
                  alert.level === 'L3' ? 'border-l-destructive' :
                  alert.level === 'L2' ? 'border-l-orange-500' : 'border-l-amber-500',
                  alert.acknowledged && "opacity-60 grayscale"
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded text-white",
                      alert.level === 'L3' ? 'bg-destructive' :
                      alert.level === 'L2' ? 'bg-orange-500' : 'bg-amber-500'
                    )}>
                      {alert.level} - {alert.type}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{alert.createdAt.substring(11, 16)}</span>
                  </div>
                  <p className="font-semibold text-sm mb-1">{alert.officerName} <span className="text-muted-foreground font-normal">({alert.zone})</span></p>
                  <p className="text-xs text-muted-foreground mb-2">{alert.message}</p>
                  {!alert.acknowledged && (
                    <button 
                      onClick={() => handleAck(alert.id)}
                      disabled={ackAlert.isPending}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Mini Map & Chart */}
        <div className="lg:col-span-1 flex flex-col gap-6 h-[500px]">
          <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden relative">
            <MapContainer center={[14.6819, 77.6006]} zoom={14} className="h-full w-full z-0" zoomControl={false} attributionControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              {ZONES.map(z => (
                <Circle key={z.id} center={[z.lat, z.lng]} radius={z.radius} pathOptions={{ color: '#0ea5e9', weight: 2, fillOpacity: 0.1 }} />
              ))}
              {officers.filter(o => o.latitude).map(o => (
                <CircleMarker key={o.id} center={[o.latitude!, o.longitude!]} radius={6} pathOptions={{ 
                  color: o.status === 'BREACH' ? '#dc2626' : o.status === 'IN_ZONE' ? '#10b981' : '#f59e0b', 
                  fillColor: o.status === 'BREACH' ? '#dc2626' : '#fff',
                  fillOpacity: 1, weight: 3 
                }}>
                  <LeafletTooltip direction="top" offset={[0, -10]} opacity={1}>{o.name}</LeafletTooltip>
                </CircleMarker>
              ))}
            </MapContainer>
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-border shadow-sm z-10 text-xs font-bold">
              Live Map View
            </div>
          </div>

          <div className="h-48 bg-card rounded-2xl border border-border shadow-sm p-4">
            <h3 className="font-bold text-sm mb-4">Breach Frequency (Today)</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartQuery.data || []}>
                  <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-in Officer Panel */}
      <AnimatePresence>
        {selectedOfficer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={() => setSelectedOfficerId(null)}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-14 bottom-0 right-0 w-full md:w-[360px] bg-card border-l border-border shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                <button onClick={() => setSelectedOfficerId(null)} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full">
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex flex-col items-center mt-4 text-center">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary mb-4 ring-4 ring-offset-4 ring-primary/20">
                    {selectedOfficer.name.substring(0, 2).toUpperCase()}
                  </div>
                  <h2 className="text-2xl font-bold">{selectedOfficer.name}</h2>
                  <p className="text-muted-foreground mb-4">{selectedOfficer.rank} • ID: {selectedOfficer.id}</p>
                  
                  <StatusBadge status={selectedOfficer.status} className="px-4 py-1.5 text-sm mb-6" />
                </div>

                <div className="space-y-4">
                  <div className="bg-secondary rounded-xl p-4">
                    <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Assigned Zone</p>
                    <p className="font-semibold text-lg">{selectedOfficer.zone}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-secondary rounded-xl p-4">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Time in Zone</p>
                      <p className="font-semibold text-lg font-mono">{selectedOfficer.timeInZoneToday}m</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-4">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Breaches</p>
                      <p className={cn("font-semibold text-lg font-mono", selectedOfficer.breachCount > 0 ? "text-destructive" : "")}>
                        {selectedOfficer.breachCount}
                      </p>
                    </div>
                  </div>

                  <div className="bg-secondary rounded-xl p-4">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-muted-foreground uppercase">Compliance Score</span>
                      <span className={selectedOfficer.compliance >= 80 ? "text-emerald-500" : "text-destructive"}>{selectedOfficer.compliance}%</span>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${selectedOfficer.compliance}%` }}
                        className={cn("h-full", selectedOfficer.compliance >= 80 ? "bg-emerald-500" : selectedOfficer.compliance >= 50 ? "bg-amber-500" : "bg-destructive")}
                      />
                    </div>
                  </div>

                  {selectedOfficer.latitude && (
                    <div className="bg-secondary rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Last GPS Fix</p>
                        <p className="font-mono text-sm">{selectedOfficer.latitude.toFixed(5)}, {selectedOfficer.longitude?.toFixed(5)}</p>
                      </div>
                      <LocateFixed className="w-5 h-5 text-primary opacity-50" />
                    </div>
                  )}
                </div>

                <div className="mt-8 space-y-3">
                  <a href={`tel:${selectedOfficer.mobile}`} className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all">
                    <Phone className="w-5 h-5" /> Call Officer
                  </a>
                  <button className="flex items-center justify-center gap-2 w-full py-3 bg-card border-2 border-border hover:bg-secondary font-bold rounded-xl transition-all">
                    <BellRing className="w-5 h-5" /> Send Warning Alert
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, highlight, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={cn("bg-card rounded-2xl p-5 border border-border shadow-sm flex items-center justify-between", highlight && "ring-2 ring-destructive animate-pulse")}
    >
      <div>
        <p className="text-sm font-semibold text-muted-foreground mb-1">{title}</p>
        <h3 className="text-4xl font-bold font-mono">
          {value === undefined ? <span className="text-transparent bg-muted rounded animate-pulse">00</span> : value}
        </h3>
      </div>
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", color)}>
        <Icon className="w-6 h-6" />
      </div>
    </motion.div>
  );
}

function StatusBadge({ status, className }: { status: string, className?: string }) {
  const styles = {
    IN_ZONE: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
    BREACH: "bg-destructive text-white blink-badge shadow-sm shadow-destructive/50",
    LATE: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    OFFLINE: "bg-slate-100 text-slate-500 border border-slate-200"
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide", styles[status as keyof typeof styles], className)}>
      {status.replace("_", " ")}
    </span>
  );
}

// Need this missing icon for the panel close button
import { X } from "lucide-react";
