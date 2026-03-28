import React from "react";
import { Link, useLocation } from "wouter";
import { Home, ScanFace, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function OfficerLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, name } = useAuth();

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[480px] bg-card min-h-screen shadow-2xl relative flex flex-col">
        
        {/* Top Bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0 bg-primary/5">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="w-8 h-8 text-primary">
              <ellipse cx="50" cy="50" rx="40" ry="25" fill="none" stroke="currentColor" strokeWidth="6" />
              <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="4" />
              <circle cx="50" cy="50" r="5" fill="currentColor" />
            </svg>
            <div>
              <div className="font-bold tracking-widest text-primary leading-tight">NETRA</div>
              <div className="text-[10px] font-telugu text-muted-foreground leading-tight">మూయని నేత్రం</div>
            </div>
          </div>
          <button onClick={logout} className="p-2 text-muted-foreground hover:text-destructive bg-card rounded-full shadow-sm">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-24 relative p-4">
          {children}
        </main>

        {/* Bottom Nav */}
        <nav className="absolute bottom-0 left-0 right-0 h-20 bg-card border-t border-border flex items-center justify-center px-4 gap-4 pb-safe z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-2xl">
          <Link href="/officer" className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all",
            location === "/officer" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 -translate-y-2" : "text-muted-foreground hover:bg-secondary"
          )}>
            <Home className="w-6 h-6" />
            <span className="text-xs font-bold">Home</span>
          </Link>
          
          <Link href="/officer/face-verify" className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all",
            location === "/officer/face-verify" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 -translate-y-2" : "text-muted-foreground hover:bg-secondary"
          )}>
            <ScanFace className="w-6 h-6" />
            <span className="text-xs font-bold">Attendance</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
