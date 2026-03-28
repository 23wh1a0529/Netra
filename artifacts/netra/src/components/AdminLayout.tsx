import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Map as MapIcon, Users, Bell, Flame, Megaphone, AlertTriangle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { PanicOverlay } from "./PanicOverlay";
import { DemoModePanel } from "./DemoModePanel";
import { useSocket } from "@/contexts/SocketContext";

const NAV_ITEMS = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/map", icon: MapIcon, label: "Live Map" },
  { path: "/admin/personnel", icon: Users, label: "Personnel" },
  { path: "/admin/alerts", icon: Bell, label: "Incident Log" },
  { path: "/admin/announcements", icon: Megaphone, label: "Announcements" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, name } = useAuth();
  const [time, setTime] = useState(new Date());
  const [demoOpen, setDemoOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const { triggerDemoPanic } = useSocket();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') setDemoOpen(p => !p);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogoClick = () => {
    setClickCount(p => p + 1);
    if (clickCount >= 2) {
      setDemoOpen(true);
      setClickCount(0);
    }
    setTimeout(() => setClickCount(0), 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <PanicOverlay />
      {demoOpen && <DemoModePanel onClose={() => setDemoOpen(false)} />}

      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3 w-64">
          <div onClick={handleLogoClick} className="cursor-pointer flex items-center gap-2 group">
            <svg viewBox="0 0 100 100" className="w-8 h-8 text-primary group-hover:rotate-180 transition-transform duration-700">
              <ellipse cx="50" cy="50" rx="40" ry="25" fill="none" stroke="currentColor" strokeWidth="6" />
              <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="4" />
              <circle cx="50" cy="50" r="5" fill="currentColor" />
            </svg>
            <span className="font-bold text-lg tracking-widest">నేత్ర NETRA</span>
          </div>
        </div>

        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 bg-destructive/10 px-4 py-1.5 rounded-full border border-destructive/20">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-destructive font-bold text-sm tracking-[0.2em]">LIVE — VIP SECURITY — ANANTAPUR</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex bg-secondary rounded-lg p-1">
            <button className="px-3 py-1 text-xs font-bold rounded-md bg-card shadow-sm text-foreground">EN</button>
            <button className="px-3 py-1 text-xs font-bold rounded-md text-muted-foreground hover:text-foreground transition-colors">తె</button>
          </div>
          
          <div className="font-mono font-semibold text-foreground bg-secondary px-3 py-1.5 rounded-lg border border-border hidden sm:block">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </div>

          <div className="flex items-center gap-2 pl-4 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
              {name ? name.substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <button onClick={logout} className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Desktop */}
      <aside className="fixed left-0 top-14 bottom-0 w-16 bg-card border-r border-border hidden md:flex flex-col items-center py-4 gap-2 z-30">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path} className={cn(
              "relative group p-3 rounded-xl transition-all duration-200",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}>
              <item.icon className={cn("w-6 h-6", isActive && "scale-110")} />
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />}
              
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-foreground text-background text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            </Link>
          );
        })}
      </aside>

      {/* Bottom Nav Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border md:hidden z-30 flex items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path} className={cn(
              "p-2 flex flex-col items-center gap-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="flex-1 mt-14 md:ml-16 mb-16 md:mb-0 p-4 md:p-6 overflow-x-hidden relative">
        {children}
      </main>

      {/* Global Panic Button */}
      <button 
        onClick={triggerDemoPanic}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 w-16 h-16 bg-destructive text-white rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center hover:scale-110 transition-transform z-40 group"
      >
        <div className="absolute inset-0 rounded-full border-2 border-destructive animate-ping opacity-75" />
        <AlertTriangle className="w-8 h-8 group-hover:animate-pulse" />
      </button>
    </div>
  );
}
