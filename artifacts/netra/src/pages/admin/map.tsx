import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Tooltip } from "react-leaflet";
import { useListPersonnel } from "@workspace/api-client-react";
import { Users, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const ZONES = [
  { id: "Z1", name: "Collectorate", lat: 14.6819, lng: 77.6006, radius: 40 },
  { id: "Z2", name: "Gandhi Gunj", lat: 14.6853, lng: 77.5983, radius: 35 },
  { id: "Z3", name: "RTC Bus Stand", lat: 14.6791, lng: 77.5969, radius: 30 },
  { id: "Z4", name: "Subash Road", lat: 14.6831, lng: 77.5992, radius: 25 },
  { id: "Z5", name: "Helipad", lat: 14.6900, lng: 77.6050, radius: 50 },
];

export function LiveMapPage() {
  const { data: officers = [] } = useListPersonnel();
  const [filterBreach, setFilterBreach] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const displayOfficers = filterBreach ? officers.filter(o => o.status === 'BREACH') : officers;

  return (
    <div className="h-[calc(100vh-5.5rem)] -mx-4 md:-mx-6 -mt-4 md:-mt-6 relative">
      <MapContainer center={[14.6819, 77.6006]} zoom={15} className="w-full h-full z-0" zoomControl={false}>
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
          attribution='&copy; <a href="https://carto.com/">Carto</a>'
        />
        
        {/* Radar Sweep Overlay - centered on main coord */}
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center overflow-hidden">
           <div className="w-[800px] h-[800px] rounded-full border border-primary/20 radar-sweep relative">
             <div className="absolute top-1/2 left-1/2 w-1/2 h-1 origin-left bg-gradient-to-r from-primary/80 to-transparent blur-[2px]" />
           </div>
        </div>

        {ZONES.map(z => {
          const zoneOfficers = officers.filter(o => o.zone === z.name);
          const hasBreach = zoneOfficers.some(o => o.status === 'BREACH');
          return (
            <Circle 
              key={z.id} 
              center={[z.lat, z.lng]} 
              radius={z.radius} 
              pathOptions={{ 
                color: hasBreach ? '#dc2626' : '#0ea5e9', 
                weight: hasBreach ? 3 : 2, 
                fillOpacity: hasBreach ? 0.2 : 0.1,
                dashArray: hasBreach ? '' : '5, 5'
              }}
              className={cn(hasBreach && "flash-border")}
            >
              <Tooltip sticky>
                <div className="text-center font-sans">
                  <div className="font-bold text-sm">{z.name}</div>
                  <div className="text-xs text-muted-foreground">{zoneOfficers.length} Officers Assigned</div>
                </div>
              </Tooltip>
            </Circle>
          );
        })}

        {displayOfficers.filter(o => o.latitude && o.longitude).map(o => (
          <CircleMarker 
            key={o.id} 
            center={[o.latitude!, o.longitude!]} 
            radius={8} 
            pathOptions={{ 
              color: o.status === 'BREACH' ? '#dc2626' : o.status === 'IN_ZONE' ? '#10b981' : '#f59e0b', 
              fillColor: '#fff',
              fillOpacity: 1, 
              weight: 4 
            }}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={1}>
              <div className="font-sans px-1">
                <div className="font-bold border-b border-border pb-1 mb-1">{o.name} <span className="text-xs font-normal text-muted-foreground ml-1">({o.rank})</span></div>
                <div className={cn("text-xs font-bold", o.status === 'BREACH' ? "text-destructive" : "text-emerald-500")}>{o.status}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1">Updated: {o.lastSeen?.substring(11, 19)}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Floating Panel */}
      <div className="absolute top-4 left-4 z-[500]">
        <div className="bg-card/95 backdrop-blur shadow-lg border border-border rounded-xl p-2 w-64">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-border mb-2">
            <h3 className="font-bold flex items-center gap-2 text-sm"><Filter className="w-4 h-4 text-primary"/> Filters</h3>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{displayOfficers.length} Visible</span>
          </div>
          <label className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors">
            <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-muted-foreground/30 transition-colors [&:has(:checked)]:bg-destructive">
              <input type="checkbox" className="peer sr-only" checked={filterBreach} onChange={e => setFilterBreach(e.target.checked)} />
              <span className="inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">Show Breaches Only</span>
          </label>
        </div>
      </div>
    </div>
  );
}
